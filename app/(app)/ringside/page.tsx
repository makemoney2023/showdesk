"use client";

import { useCallback, useEffect, useState } from "react";
import { deskLoadState } from "@/lib/domain/desk-load-state";
import {
  competitionDaysWithEntries,
  competitionPoolsWithDogs,
  defaultCompetitionDay,
  localCalendarIso,
} from "@/lib/domain/catalog-competition";
import { CompetitionDayFilter } from "@/components/desk/CompetitionDayFilter";
import { CompetitionPoolFilterChips } from "@/components/desk/CompetitionPoolFilterChips";
import {
  isRingsideSearchActive,
  ringsideEntryContextQuery,
  ringsideTileClassLabel,
  visibleRingsideEntries,
} from "@/lib/domain/ringside-roster";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  type CritiqueUiStatus,
} from "@/lib/domain/status-labels";
import { DogSearchField } from "@/components/desk/DogSearchField";
import { DogTile } from "@/components/desk/DogTile";
import { dogPhotoHrefForEntry } from "@/lib/domain/dog-photo";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import type { CritiqueRecord, RosterEntryRecord } from "@/lib/types";

function statusForEntry(
  entryId: string,
  critiques: CritiqueRecord[],
): CritiqueUiStatus {
  const list = critiques
    .filter((c) => c.entry_id === entryId)
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at));
  return list[0]?.status ?? "none";
}

export default function RingsidePage() {
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [poolFilter, setPoolFilter] = useState("all");
  const [completedPool, setCompletedPool] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [status, setStatus] = useState<number | undefined>();
  const [activeShowId, setActiveShowId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    setLoaded(true);
    if (!showRes.ok) {
      setFetchFailed(true);
      setStatus(showRes.status);
      return;
    }
    setFetchFailed(false);
    setStatus(showRes.status);
    const showData = (await showRes.json()) as { active_show_id: string | null };
    setActiveShowId(showData.active_show_id);
    if (!showData.active_show_id) return;
    const [entryRes, critRes] = await Promise.all([
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
    ]);
    if (!entryRes.ok || !critRes.ok) {
      setFetchFailed(true);
      setStatus(entryRes.ok ? critRes.status : entryRes.status);
      return;
    }
    setEntries(((await entryRes.json()) as { entries: RosterEntryRecord[] }).entries);
    setCritiques(
      ((await critRes.json()) as { critiques: CritiqueRecord[] }).critiques,
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDay = params.get("date");
    const requestedPool = params.get("pool");
    if (requestedDay) setSelectedDay(requestedDay);
    if (requestedPool) setPoolFilter(requestedPool);
    setCompletedPool(Boolean(params.get("pool_complete")));
  }, []);

  const loadState = deskLoadState({
    fetchFailed,
    status,
    activeShowId,
    loaded,
  });
  const days = competitionDaysWithEntries(entries);
  const activeDay =
    selectedDay !== null && days.some((day) => day.day === selectedDay)
      ? selectedDay
      : defaultCompetitionDay(days, localCalendarIso());
  const dayEntries = entries.filter(
    (entry) => (entry.competition_day ?? "") === activeDay,
  );
  const pools = competitionPoolsWithDogs(dayEntries);
  const activePool =
    poolFilter === "all" || pools.some((pool) => pool.key === poolFilter)
      ? poolFilter
      : "all";
  const searching = isRingsideSearchActive(search);
  const filtered = visibleRingsideEntries(entries, {
    search,
    activeDay,
    activePool,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Dogs
        </h1>
        <p className="text-sm text-sss-text-secondary">
          Date, published class, sex, and armband
        </p>
        {completedPool ? (
          <p className="mt-2 text-sm font-medium text-sss-success">
            Day/class/sex pool complete — choose the next pool when ready.
          </p>
        ) : null}
      </div>

      {days.length > 0 ? (
      <div className="sticky top-[3.25rem] z-20 -mx-4 space-y-2 bg-sss-ground/90 px-4 py-2 backdrop-blur">
        <CompetitionDayFilter
          days={days}
          value={activeDay}
          onChange={(day) => {
            setSelectedDay(day);
            setPoolFilter("all");
            setCompletedPool(false);
          }}
        />
        <DogSearchField
          value={search}
          onChange={setSearch}
          aria-label="Search dogs"
          placeholder="Search all days — armband, dog, or owner"
        />
        {searching ? (
          <p className="text-xs text-sss-text-muted" role="status">
            Showing matches from all days
          </p>
        ) : null}
        <CompetitionPoolFilterChips
          pools={pools}
          value={activePool}
          onChange={(pool) => {
            setPoolFilter(pool);
            setCompletedPool(false);
          }}
        />
      </div>
      ) : null}

      <ul className="space-y-3">
        {filtered.map((e) => {
          const status = statusForEntry(e.id, critiques);
          return (
            <DogTile
              key={e.id}
              entryId={e.id}
              armband={e.armband}
              dogName={e.dog_name}
              classLabel={ringsideTileClassLabel(e, search)}
              contextQuery={ringsideEntryContextQuery(e, {
                search,
                activeDay,
                activePool,
              })}
              statusLabel={
                e.event_kind === "se"
                  ? "SE entry"
                  : labelCritiqueStatus(status)
              }
              statusTone={
                e.event_kind === "se" ? "muted" : critiqueChipTone(status)
              }
              showCritiqueAction={e.event_kind !== "se"}
              showSeAction={e.event_kind !== "conformation"}
              photoHref={dogPhotoHrefForEntry(activeShowId, entries, e)}
            />
          );
        })}
      </ul>
      {loadState.kind === "loading" ? (
        <ul className="space-y-3" aria-label="Loading dogs">
          <li className="sss-skeleton h-32" />
          <li className="sss-skeleton h-32" />
        </ul>
      ) : null}
      {loadState.kind === "unauthorized" ? (
        <EmptyDesk variant="unauthorized" />
      ) : null}
      {loadState.kind === "no-show" ? (
        <EmptyDesk variant="no-show-steward" />
      ) : null}
      {loadState.kind === "ready" && filtered.length === 0 && !search.trim() ? (
        <p
          className="sss-tray p-5 text-sm text-sss-text-muted"
          role="status"
          aria-live="polite"
        >
          No entries for this date and division.
        </p>
      ) : null}
      {loadState.kind === "ready" && filtered.length === 0 && search.trim() ? (
        <p
          className="sss-tray p-5 text-sm text-sss-text-muted"
          role="status"
          aria-live="polite"
        >
          No dogs match “{search}”.
        </p>
      ) : null}
    </div>
  );
}
