import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import { parseRosterCsv, validateRosterEntryUpdate } from "@/lib/domain/roster";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
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

  const body = (await request.json()) as
    | { action: "import_csv"; show_id: string; csv: string }
    | { action: "create"; show_id: string; entry: Omit<RosterEntryRecord, "id" | "show_id"> };

  if (body.action === "import_csv") {
    const parsed = parseRosterCsv(body.csv);
    if (parsed.entries.length === 0 && parsed.errors.length > 0) {
      return NextResponse.json({ errors: parsed.errors }, { status: 400 });
    }
    const newEntries: RosterEntryRecord[] = parsed.entries.map((e) => ({
      ...e,
      id: newId("entry"),
      show_id: body.show_id,
    }));
    await updateStore((s) => ({
      ...s,
      entries: [...s.entries, ...newEntries],
    }));
    return NextResponse.json({ imported: newEntries.length, errors: parsed.errors });
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

  const body = (await request.json()) as {
    show_id: string;
    entry: RosterEntryRecord;
  };

  if (!body.entry || body.entry.show_id !== body.show_id) {
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
  await updateStore((s) => ({
    ...s,
    entries: s.entries.filter((e) => !(e.id === id && e.show_id === showId)),
  }));
  return NextResponse.json({ ok: true });
}
