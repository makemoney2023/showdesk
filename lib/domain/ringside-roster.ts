import {
  catalogCompetitionLabel,
  catalogDivisionLabel,
  competitionPoolKey,
  competitionPoolsWithDogs,
  type CompetitionPoolEntry,
} from "./catalog-competition";
import { dogRecordMatchesSearch, type DogSearchRecord } from "./dog-search";

export type RingsideRosterEntry = CompetitionPoolEntry &
  DogSearchRecord & { armband: string };

export function isRingsideSearchActive(search: string): boolean {
  return Boolean(search.trim());
}

/**
 * Day and class chips browse one session. A search query finds the dog
 * across every competition day and ignores the current pool chip.
 */
export function visibleRingsideEntries<T extends RingsideRosterEntry>(
  entries: T[],
  input: {
    search: string;
    activeDay: string;
    activePool: string;
  },
): T[] {
  const searching = isRingsideSearchActive(input.search);
  const scoped = searching
    ? entries.filter((entry) => dogRecordMatchesSearch(input.search, entry))
    : entries
        .filter((entry) => (entry.competition_day ?? "") === input.activeDay)
        .filter(
          (entry) =>
            input.activePool === "all" ||
            competitionPoolKey(entry) === input.activePool,
        );
  const poolSource = searching
    ? entries
    : entries.filter((entry) => (entry.competition_day ?? "") === input.activeDay);
  const poolOrder = new Map(
    competitionPoolsWithDogs(poolSource).map((pool, index) => [pool.key, index]),
  );
  return [...scoped].toSorted((a, b) => {
    const dayDifference = searching
      ? (a.competition_day ?? "").localeCompare(b.competition_day ?? "")
      : 0;
    const poolDifference =
      (poolOrder.get(competitionPoolKey(a) ?? "") ?? 99) -
      (poolOrder.get(competitionPoolKey(b) ?? "") ?? 99);
    return (
      dayDifference ||
      poolDifference ||
      a.armband.localeCompare(b.armband, undefined, { numeric: true })
    );
  });
}

export function ringsideTileClassLabel(
  entry: CompetitionPoolEntry,
  search: string,
): string {
  return isRingsideSearchActive(search)
    ? catalogCompetitionLabel(entry)
    : catalogDivisionLabel(entry);
}

export function ringsideEntryContextQuery(
  entry: { competition_day?: string },
  input: { search: string; activeDay: string; activePool: string },
): string {
  const params = new URLSearchParams();
  const searching = isRingsideSearchActive(input.search);
  const day = searching ? (entry.competition_day ?? "") : input.activeDay;
  if (day) params.set("date", day);
  if (!searching && input.activePool !== "all") {
    params.set("pool", input.activePool);
  }
  return params.toString();
}
