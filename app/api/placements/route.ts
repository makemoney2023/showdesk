import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  placementEntriesBelongToShow,
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
  const ownership = placementEntriesBelongToShow(
    body.placements,
    current.entries,
    body.show_id,
  );
  if (!ownership.valid) {
    return NextResponse.json({ error: ownership.error }, { status: 400 });
  }

  const store = await updateStore((s) => ({
    ...s,
    placements: upsertPlacements(
      s.placements,
      body.show_id,
      body.placements,
      () => newId("placement"),
    ),
  }));

  return NextResponse.json({
    placements: filterByShow(store.placements, body.show_id),
  });
}
