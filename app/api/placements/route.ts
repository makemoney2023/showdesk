import { NextResponse } from "next/server";
import { readStore, updateStore, newId } from "@/lib/store";
import { filterByShow } from "@/lib/domain/show-scope";
import {
  applyFormwertUpdates,
  incompletePlacementScopeError,
  resolveFormwertInputs,
  resolvePlacementInputs,
  upsertPlacements,
  type FormwertInput,
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
    placements?: PlacementInput[];
    ratings?: FormwertInput[];
  }>(request);
  const placements = Array.isArray(body?.placements) ? body.placements : null;
  const ratings = Array.isArray(body?.ratings) ? body.ratings : null;
  if (!body?.show_id || (!placements && !ratings)) {
    return NextResponse.json(
      { error: "show_id and placements[] or ratings[] required" },
      { status: 400 },
    );
  }
  const placementRows = placements ?? [];
  const ratingRows = ratings ?? [];
  if (placementRows.length === 0 && ratingRows.length === 0) {
    return NextResponse.json(
      { error: "placements[] or ratings[] must include at least one row" },
      { status: 400 },
    );
  }

  const current = await readStore();
  let resolvedPlacements: ReturnType<typeof resolvePlacementInputs> | null =
    null;
  if (placementRows.length > 0) {
    resolvedPlacements = resolvePlacementInputs(
      placementRows,
      current.entries,
      body.show_id,
    );
    if (!resolvedPlacements.valid) {
      return NextResponse.json(
        { error: resolvedPlacements.error },
        { status: 400 },
      );
    }
    const scopeError = incompletePlacementScopeError(
      resolvedPlacements.rows,
      current.entries,
      body.show_id,
    );
    if (scopeError) {
      return NextResponse.json({ error: scopeError }, { status: 400 });
    }
  }

  let resolvedRatings: ReturnType<typeof resolveFormwertInputs> | null = null;
  if (ratingRows.length > 0) {
    resolvedRatings = resolveFormwertInputs(
      ratingRows,
      current.entries,
      body.show_id,
    );
    if (!resolvedRatings.valid) {
      return NextResponse.json({ error: resolvedRatings.error }, { status: 400 });
    }
  }

  let store: Awaited<ReturnType<typeof updateStore>>;
  try {
    store = await updateStore((s) => {
      const nextPlacements =
        resolvedPlacements && resolvedPlacements.valid
          ? upsertPlacements(
              s.placements,
              body.show_id,
              resolvedPlacements.rows,
              () => newId("placement"),
            )
          : s.placements;
      const rated =
        resolvedRatings && resolvedRatings.valid
          ? applyFormwertUpdates({
              showId: body.show_id,
              entries: s.entries,
              evaluations: s.se_evaluations ?? [],
              critiques: s.critiques,
              show: s.shows.find((show) => show.id === body.show_id),
              rows: resolvedRatings.rows,
              newEvaluationId: () => newId("se"),
              newCritiqueId: () => newId("critique"),
            })
          : {
              evaluations: s.se_evaluations ?? [],
              critiques: s.critiques,
            };
      return {
        ...s,
        placements: nextPlacements,
        se_evaluations: rated.evaluations,
        critiques: rated.critiques,
      };
    });
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
    evaluations: filterByShow(store.se_evaluations ?? [], body.show_id),
    critiques: filterByShow(store.critiques, body.show_id),
  });
}
