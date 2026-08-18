import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import { upsertPlacements, type PlacementInput } from "@/lib/domain/placements";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

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
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id: string;
    placements: PlacementInput[];
  };
  if (!body.show_id || !Array.isArray(body.placements)) {
    return NextResponse.json(
      { error: "show_id and placements[] required" },
      { status: 400 },
    );
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
