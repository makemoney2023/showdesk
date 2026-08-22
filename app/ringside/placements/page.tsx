"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatAdrkFormwert } from "@/lib/domain/adrk-template";
import {
  divisionLabel,
  divisionsWithDogs,
} from "@/lib/domain/class-division";
import {
  assignClassPlacement,
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
} from "@/lib/types";

export default function PlacementsPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [placements, setPlacements] = useState<Record<string, number | "">>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
      return;
    }
    setShowId(showData.active_show_id);
    const [entryRes, placeRes, critRes] = await Promise.all([
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/placements?show_id=${showData.active_show_id}`),
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
    ]);
    if (!entryRes.ok || !placeRes.ok) {
      setStatus("Could not load roster or placements");
      return;
    }
    const entryData = (await entryRes.json()) as { entries: RosterEntryRecord[] };
    const placeData = (await placeRes.json()) as { placements: PlacementRecord[] };
    setEntries(entryData.entries);
    const map: Record<string, number | ""> = {};
    for (const p of placeData.placements) {
      map[p.entry_id] = p.placement;
    }
    setPlacements(map);
    if (critRes.ok) {
      const critData = (await critRes.json()) as { critiques: CritiqueRecord[] };
      setCritiques(critData.critiques);
    } else {
      setCritiques([]);
    }
    setStatus("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formwertByEntry = useMemo(
    () => resolveFormwertByEntryId(critiques),
    [critiques],
  );

  const byDivision = divisionsWithDogs(entries).map((division) => ({
    ...division,
    dogs: sortDogsForPlacement(
      entries.filter(
        (entry) =>
          entry.class_id === division.class_id && entry.sex === division.sex,
      ),
      formwertByEntry,
    ),
  }));

  function applySortByRating() {
    const suggested = placementsSuggestedFromFormwert(entries, formwertByEntry);
    const next: Record<string, number | ""> = {};
    for (const row of suggested) {
      next[row.entry_id] = row.placement ?? "";
    }
    setPlacements(next);
    setStatus("Sorted by rating — review, then Save placements");
    pushToast("Placements filled from rating order within each division");
  }

  async function save() {
    if (busy) return;
    if (!showId) {
      setStatus("No active show — create one on Roster.");
      return;
    }
    setBusy(true);
    const payload = entries.map((e) => ({
      entry_id: e.id,
      placement:
        placements[e.id] === "" || placements[e.id] == null
          ? null
          : (Number(placements[e.id]) as 1 | 2 | 3 | 4),
    }));
    const res = await fetch("/api/placements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, placements: payload }),
    });
    const ok = res.ok;
    setStatus(ok ? "Placements saved" : "Save failed");
    pushToast(ok ? "Placements saved" : "Save failed", ok ? "ok" : "error");
    setBusy(false);
    await load();
  }

  const ratedCount = Object.values(formwertByEntry).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Division placements"
        description="Male and female divisions are separate. Auto-sort fills places 1–4 from ratings within each division."
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
          No ratings yet — set them in Review, then Auto-sort becomes available.
        </p>
      ) : null}
      {byDivision.map((division) =>
        division.dogs.length > 0 ? (
          <section key={division.key} className="sss-paper p-5">
            <h2 className="font-medium">{divisionLabel(division)}</h2>
            <p className="text-xs text-sss-text-muted">
              {division.count} dog{division.count === 1 ? "" : "s"} · separate
              placement pool
            </p>
            <ul className="mt-3 space-y-3">
              {division.dogs.map((dog) => {
                const formwert = formwertByEntry[dog.id];
                const divisionIds = division.dogs.map((item) => item.id);
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
                    <span className="min-w-24 text-xs text-sss-text-muted">
                      {formatAdrkFormwert(formwert ?? null)}
                    </span>
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
                                  divisionIds,
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
    </div>
  );
}
