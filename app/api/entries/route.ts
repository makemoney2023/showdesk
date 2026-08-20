import { NextResponse } from "next/server";
import {
  readStore,
  updateStore,
  newId,
  deleteCritiqueAudio,
} from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  mergeImportedEntries,
  parseRosterCsv,
  validateRosterEntry,
  validateRosterEntryUpdate,
} from "@/lib/domain/roster";
import {
  critiquesForEntry,
  removeEntryAndChildren,
} from "@/lib/domain/entry-cascade";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";
import type { RosterEntryRecord } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const store = await readStore();
  const activeShow = showId ?? store.active_show_id;
  if (!activeShow) {
    return NextResponse.json({ entries: [] });
  }
  return NextResponse.json({
    entries: filterByShow(store.entries, activeShow),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<
    | { action: "import_csv"; show_id: string; csv: string }
    | {
        action: "create";
        show_id: string;
        entry: Omit<RosterEntryRecord, "id" | "show_id">;
      }
  >(request);
  if (!body || !body.show_id) {
    return NextResponse.json(
      { error: "show_id and action required" },
      { status: 400 },
    );
  }

  const store = await readStore();
  if (!store.shows.some((show) => show.id === body.show_id)) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (body.action === "import_csv") {
    if (typeof body.csv !== "string") {
      return NextResponse.json({ error: "csv required" }, { status: 400 });
    }
    const parsed = parseRosterCsv(body.csv);
    if (parsed.entries.length === 0 && parsed.errors.length > 0) {
      return NextResponse.json({ errors: parsed.errors }, { status: 400 });
    }
    const incoming = parsed.entries.map((entry) => ({
      ...entry,
      show_id: body.show_id,
    }));
    let added = 0;
    let updated = 0;
    await updateStore((s) => {
      const merged = mergeImportedEntries(s.entries, incoming, () =>
        newId("entry"),
      );
      added = merged.added;
      updated = merged.updated;
      return { ...s, entries: merged.entries };
    });
    return NextResponse.json({
      imported: added + updated,
      added,
      updated,
      errors: parsed.errors,
    });
  }

  if (body.action !== "create" || !body.entry) {
    return NextResponse.json(
      { error: "action must be import_csv or create" },
      { status: 400 },
    );
  }

  const validation = validateRosterEntry(body.entry);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const entry: RosterEntryRecord = {
    ...body.entry,
    id: newId("entry"),
    show_id: body.show_id,
  };
  await updateStore((s) => ({ ...s, entries: [...s.entries, entry] }));
  return NextResponse.json({ entry });
}

export async function PUT(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    entry: RosterEntryRecord;
  }>(request);
  if (!body?.entry || body.entry.show_id !== body.show_id) {
    return NextResponse.json(
      { error: "entry.show_id must match show_id" },
      { status: 400 },
    );
  }

  const validation = validateRosterEntryUpdate(body.entry);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const store = await readStore();
  const exists = store.entries.some(
    (e) => e.id === body.entry.id && e.show_id === body.show_id,
  );
  if (!exists) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await updateStore((s) => ({
    ...s,
    entries: s.entries.map((e) =>
      e.id === body.entry.id && e.show_id === body.show_id ? body.entry : e,
    ),
  }));
  return NextResponse.json({ ok: true, entry: body.entry });
}

export async function DELETE(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const showId = searchParams.get("show_id");
  if (!id || !showId) {
    return NextResponse.json({ error: "id and show_id required" }, { status: 400 });
  }

  const store = await readStore();
  const exists = store.entries.some((e) => e.id === id && e.show_id === showId);
  if (!exists) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const audioPaths = critiquesForEntry(store.critiques, id, showId)
    .map((critique) => critique.audio_path)
    .filter((path): path is string => Boolean(path));

  await updateStore((s) => removeEntryAndChildren(s, id, showId));
  await Promise.all(
    audioPaths.map((relativePath) =>
      deleteCritiqueAudio(relativePath).catch(() => undefined),
    ),
  );
  return NextResponse.json({ ok: true });
}
