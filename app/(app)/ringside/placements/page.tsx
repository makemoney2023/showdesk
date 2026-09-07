"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormwertSelect } from "@/components/ringside/FormwertSelect";
import {
  formwertScaleForEntry,
  type AdrkFormwertCode,
} from "@/lib/domain/adrk-template";
import {
  competitionPoolKey,
  competitionPoolsWithDogs,
  isConformationEntry,
} from "@/lib/domain/catalog-competition";
import {
  assignClassPlacement,
  dirtyFormwertEntryIds,
  dirtyPlacementPoolKeys,
  initialPlacementSelections,
  placementRowsForPools,
  placementsSuggestedFromFormwert,
  resolveFormwertByEntryId,
  sortDogsForPlacement,
} from "@/lib/domain/placements";
import { PageHeader } from "@/components/ui/page-header";
import { pushToast } from "@/components/feedback/toast";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
} from "@/lib/types";

export default function PlacementsPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [evaluations, setEvaluations] = useState<SeEvaluationRecord[]>([]);
  const [placements, setPlacements] = useState<Record<string, number | "">>({});
  const [savedPlacements, setSavedPlacements] = useState<
    Record<string, number | "">
  >({});
  const [ratings, setRatings] = useState<
    Record<string, AdrkFormwertCode | null>
  >({});
  const [savedRatings, setSavedRatings] = useState<
    Record<string, AdrkFormwertCode | null>
  >({});
  const [savingRatingId, setSavingRatingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const seedRatings = useCallback(
    (
      nextEntries: RosterEntryRecord[],
      nextCritiques: CritiqueRecord[],
      nextEvaluations: SeEvaluationRecord[],
    ) => {
      const next = resolveFormwertByEntryId(
        nextCritiques,
        nextEvaluations,
        nextEntries,
      );
      setRatings(next);
      setSavedRatings(next);
      return next;
    },
    [],
  );

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setStatus(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load placements",
      );
      return;
    }
    const showData = (await showRes.json()) as { active_show_id: string | null };
    if (!showData.active_show_id) {
      setStatus("No active show — create one on Roster.");
      setShowId(null);
      setEntries([]);
      setCritiques([]);
      setEvaluations([]);
      setRatings({});
      setSavedRatings({});
      return;
    }
    setShowId(showData.active_show_id);
    const [entryRes, placeRes, critRes, seRes] = await Promise.all([
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/placements?show_id=${showData.active_show_id}`),
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
      fetch(`/api/evaluations?show_id=${showData.active_show_id}`),
    ]);
    if (!entryRes.ok || !placeRes.ok) {
      setStatus("Could not load roster or placements");
      return;
    }
    const entryData = (await entryRes.json()) as { entries: RosterEntryRecord[] };
    const placeData = (await placeRes.json()) as { placements: PlacementRecord[] };
    setEntries(entryData.entries);
    let nextCritiques: CritiqueRecord[] = [];
    let nextEvaluations: SeEvaluationRecord[] = [];
    if (critRes.ok) {
      nextCritiques = ((await critRes.json()) as { critiques: CritiqueRecord[] })
        .critiques;
    }
    if (seRes.ok) {
      nextEvaluations = (
        (await seRes.json()) as { evaluations: SeEvaluationRecord[] }
      ).evaluations;
    }
    setCritiques(nextCritiques);
    setEvaluations(nextEvaluations);
    const formwertByEntry = seedRatings(
      entryData.entries,
      nextCritiques,
      nextEvaluations,
    );
    const suggested = initialPlacementSelections(
      placeData.placements,
      entryData.entries,
      formwertByEntry,
    );
    setPlacements(suggested);
    setSavedPlacements(suggested);
    const filledFromRatings =
      placeData.placements.length === 0 &&
      Object.values(suggested).some((place) => place !== "");
    setStatus(
      filledFromRatings
        ? "Places 1–4 filled from SE ratings — review, then Save placements"
        : "",
    );
  }, [seedRatings]);

  useEffect(() => {
    void load();
  }, [load]);

  const formwertByEntry = useMemo(() => {
    const resolved = resolveFormwertByEntryId(critiques, evaluations, entries);
    return { ...resolved, ...ratings };
  }, [critiques, entries, evaluations, ratings]);

  const byPool = competitionPoolsWithDogs(entries).map((pool) => ({
    ...pool,
    dogs: sortDogsForPlacement(
      entries.filter(
        (entry) => competitionPoolKey(entry) === pool.key,
      ),
      formwertByEntry,
    ),
  }));
  const dayGroups = [...new Set(byPool.map((pool) => pool.competitionDay))].map(
    (competitionDay) => ({
      competitionDay,
      dayLabel:
        byPool.find((pool) => pool.competitionDay === competitionDay)
          ?.dayLabel ?? competitionDay,
      pools: byPool.filter((pool) => pool.competitionDay === competitionDay),
    }),
  );

  function applySortByRating() {
    const suggested = placementsSuggestedFromFormwert(entries, formwertByEntry);
    setPlacements((current) => {
      const next = { ...current };
      for (const row of suggested) {
        next[row.entry_id] = row.placement ?? "";
      }
      return next;
    });
    setStatus("Sorted by rating — review, then Save placements");
    pushToast("Placements filled within each day, class, and sex division");
  }

  async function persistRatings(
    rows: Array<{ entry_id: string; formwert: AdrkFormwertCode | null }>,
  ): Promise<boolean> {
    if (!showId || rows.length === 0) return true;
    const res = await fetch("/api/placements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, ratings: rows }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      evaluations?: SeEvaluationRecord[];
      critiques?: CritiqueRecord[];
    };
    if (data.evaluations) setEvaluations(data.evaluations);
    if (data.critiques) setCritiques(data.critiques);
    setSavedRatings((current) => {
      const next = { ...current };
      for (const row of rows) next[row.entry_id] = row.formwert;
      return next;
    });
    return true;
  }

  async function saveRating(entryId: string, formwert: AdrkFormwertCode | null) {
    const previous = ratings[entryId] ?? null;
    setRatings((current) => ({ ...current, [entryId]: formwert }));
    if (!showId) return;
    setSavingRatingId(entryId);
    const ok = await persistRatings([{ entry_id: entryId, formwert }]);
    setSavingRatingId(null);
    if (!ok) {
      setRatings((current) => ({ ...current, [entryId]: previous }));
      setStatus("Could not save rating");
      pushToast("Could not save rating", "error");
      return;
    }
    setStatus("Rating saved — used on SE, Review, and certificates");
    pushToast("Rating saved");
  }

  async function save() {
    if (busy) return;
    if (!showId) {
      setStatus("No active show — create one on Roster.");
      return;
    }
    const dirtyPools = dirtyPlacementPoolKeys(
      entries,
      placements,
      savedPlacements,
    );
    const payload = placementRowsForPools(entries, placements, dirtyPools);
    const dirtyRatingIds = dirtyFormwertEntryIds(
      ratings,
      savedRatings,
      entries.map((entry) => entry.id),
    );
    const ratingPayload = dirtyRatingIds.map((entryId) => ({
      entry_id: entryId,
      formwert: ratings[entryId] ?? null,
    }));
    if (payload.length === 0 && ratingPayload.length === 0) {
      setStatus("No placement changes to save");
      pushToast("No placement changes to save");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/placements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        ...(payload.length > 0 ? { placements: payload } : {}),
        ...(ratingPayload.length > 0 ? { ratings: ratingPayload } : {}),
      }),
    });
    const ok = res.ok;
    if (ok) {
      const data = (await res.json()) as {
        evaluations?: SeEvaluationRecord[];
        critiques?: CritiqueRecord[];
      };
      if (data.evaluations) setEvaluations(data.evaluations);
      if (data.critiques) setCritiques(data.critiques);
      setSavedRatings((current) => {
        const next = { ...current };
        for (const row of ratingPayload) next[row.entry_id] = row.formwert;
        return next;
      });
    }
    setStatus(ok ? "Placements saved" : "Save failed");
    pushToast(ok ? "Placements saved" : "Save failed", ok ? "ok" : "error");
    setBusy(false);
    if (ok && payload.length > 0) await load();
  }

  const conformationIds = new Set(
    entries.filter(isConformationEntry).map((entry) => entry.id),
  );
  const ratedCount = Object.entries(formwertByEntry).filter(
    ([entryId, rating]) => conformationIds.has(entryId) && Boolean(rating),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Division placements"
        description="Saturday and Sunday are independent competitions. Choose a Formwert for each dog — it copies onto the SE form, Review, and certificates. Places 1–4 fill automatically when ratings exist and nothing is saved yet."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy || ratedCount === 0}
              onClick={applySortByRating}
            >
              Auto-sort by rating
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              Save placements
            </Button>
          </>
        }
      />
      {status ? <p className="text-sm text-sss-accent-deep">{status}</p> : null}
      {ratedCount === 0 ? (
        <p className="text-xs text-sss-text-muted">
          No ratings yet — pick a Formwert in the drop-down, or set it on the
          ringside SE form. This list then sorts and fills places 1–4.
        </p>
      ) : null}
      {dayGroups.map((day) => (
        <section key={day.competitionDay || "unscheduled"} className="space-y-3">
          <div className="border-b border-sss-border pb-2">
            <p className="sss-eyebrow text-sss-accent-deep">
              Independent competition
            </p>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
              {day.dayLabel}
            </h2>
          </div>
          {day.pools.map((pool) =>
            pool.dogs.length > 0 ? (
              <section key={pool.key} className="sss-paper p-5">
                <h3 className="font-medium">{pool.label}</h3>
                <p className="text-xs text-sss-text-muted">
                  {pool.count} dog{pool.count === 1 ? "" : "s"} · separate
                  placement pool
                </p>
                <ul className="mt-3 space-y-3">
                  {pool.dogs.map((dog) => {
                    const formwert = formwertByEntry[dog.id] ?? null;
                    const poolIds = pool.dogs.map((item) => item.id);
                    const scale = formwertScaleForEntry(dog);
                    return (
                      <li
                        key={dog.id}
                        className="flex flex-wrap items-center gap-3 text-sm"
                      >
                        <span className="w-16 font-[family-name:var(--font-fraunces)] font-semibold">
                          #{dog.armband}
                        </span>
                        <span className="min-w-24 flex-1 font-medium">
                          {dog.dog_name}
                        </span>
                        <FormwertSelect
                          value={formwert}
                          scale={scale}
                          disabled={busy || savingRatingId === dog.id}
                          aria-label={`Rating for ${dog.dog_name}`}
                          onChange={(next) => void saveRating(dog.id, next)}
                        />
                        <div
                          className="flex gap-1"
                          role="group"
                          aria-label={`Placement for ${dog.dog_name}`}
                        >
                          {[1, 2, 3, 4].map((n) => {
                            const selected = placements[dog.id] === n;
                            return (
                              <button
                                key={n}
                                type="button"
                                aria-pressed={selected}
                                className={`inline-flex h-11 min-w-11 items-center justify-center rounded-sss-md text-sm font-semibold ${
                                  selected
                                    ? "bg-sss-accent text-sss-ink shadow-sss-card"
                                    : "border border-sss-border bg-sss-elevated text-sss-text-secondary hover:border-sss-accent-soft"
                                }`}
                                onClick={() =>
                                  setPlacements((p) =>
                                    assignClassPlacement(
                                      p,
                                      dog.id,
                                      n as 1 | 2 | 3 | 4,
                                      poolIds,
                                    ),
                                  )
                                }
                              >
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null,
          )}
        </section>
      ))}
    </div>
  );
}
