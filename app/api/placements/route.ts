import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  resolvePlacementInputs,
  upsertPlacements,
  type PlacementInput,
} from "@/lib/domain/placements";
import {
  requireApiSession,
  requireApiWrite,
  isApiUnauthorized,
} from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const store = await readStore();
  const activeShow = showId ?? store.active_show_id;
  if (!activeShow) return NextResponse.json({ placements: [] });
  return NextResponse.json({
    placements: filterByShow(store.placements, activeShow),
  });
}

export async function PUT(request: Request) {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    placements: PlacementInput[];
  }>(request);
  if (!body?.show_id || !Array.isArray(body.placements)) {
    return NextResponse.json(
      { error: "show_id and placements[] required" },
      { status: 400 },
    );
  }

  const current = await readStore();
  const showEntryIds = current.entries
    .filter((entry) => entry.show_id === body.show_id)
    .map((entry) => entry.id);
  const submittedIds = new Set(
    body.placements.map((placement) => placement.entry_id),
  );
  if (
    submittedIds.size !== showEntryIds.length ||
    showEntryIds.some((entryId) => !submittedIds.has(entryId))
  ) {
    return NextResponse.json(
      { error: "placements must include every entry in the show" },
      { status: 400 },
    );
  }
  const resolved = resolvePlacementInputs(
    body.placements,
    current.entries,
    body.show_id,
  );
  if (!resolved.valid) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  let store: Awaited<ReturnType<typeof updateStore>>;
  try {
    store = await updateStore((s) => ({
      ...s,
      placements: upsertPlacements(
        s.placements,
        body.show_id,
        resolved.rows,
        () => newId("placement"),
      ),
    }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save placements";
    const conflict = /duplicate|unique|division_place/i.test(message);
    return NextResponse.json(
      {
        error: conflict
          ? "A place is already assigned in this division"
          : "Could not save placements",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  return NextResponse.json({
    placements: filterByShow(store.placements, body.show_id),
  });
}
