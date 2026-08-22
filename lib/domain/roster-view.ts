import { dogRecordMatchesSearch } from "./dog-search";
import { ADRK_CLASSES, type AdrkClassId } from "./adrk-template";
import {
  classDivisionIndex,
  divisionsWithDogs,
  entryMatchesDivision,
  type DivisionFilter,
  type DogSex,
} from "./class-division";

export type RosterSort = "class" | "armband";

/** @deprecated Prefer entryMatchesDivision for competition views. */
export function entryMatchesClassFilter(
  entry: { class_id: string; sex?: DogSex },
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (filter.includes(":") && entry.sex) {
    return entryMatchesDivision(
      { class_id: entry.class_id as AdrkClassId, sex: entry.sex },
      filter,
    );
  }
  return entry.class_id === filter;
}

export function adrkClassIndex(classId: string): number {
  const index = ADRK_CLASSES.findIndex((item) => item.id === classId);
  return index < 0 ? ADRK_CLASSES.length : index;
}

export function compareArmband(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function compareRosterEntries(
  a: { class_id: AdrkClassId; sex: DogSex; armband: string },
  b: { class_id: AdrkClassId; sex: DogSex; armband: string },
  sort: RosterSort,
): number {
  const divisionOrder = classDivisionIndex(a) - classDivisionIndex(b);
  const armbandOrder = compareArmband(a.armband, b.armband);
  return sort === "armband"
    ? armbandOrder || divisionOrder
    : divisionOrder || armbandOrder;
}

export function visibleRosterEntries<
  T extends {
    class_id: AdrkClassId;
    sex: DogSex;
    armband: string;
    dog_name?: string;
    owner?: string;
  },
>(
  entries: T[],
  input: {
    search: string;
    divisionFilter?: string;
    /** Transitional alias for callers from the class-only roster. */
    classFilter?: string;
    sort?: RosterSort;
  },
): T[] {
  return entries
    .filter((entry) =>
      input.divisionFilter
        ? entryMatchesDivision(entry, input.divisionFilter)
        : entryMatchesClassFilter(entry, input.classFilter ?? "all"),
    )
    .filter((entry) => dogRecordMatchesSearch(input.search, entry))
    .toSorted((a, b) =>
      compareRosterEntries(a, b, input.sort ?? "class"),
    );
}

export function rosterEmptyMessage(input: {
  entryCount: number;
  visibleCount: number;
  search: string;
  divisionFilter?: string;
  classFilter?: string;
}): string | null {
  if (input.visibleCount > 0) return null;
  if (input.entryCount === 0) return "No dogs on this roster yet.";
  const searching = Boolean(input.search.trim());
  const filteredDivision = (input.divisionFilter ?? "all") !== "all";
  const filteredClass = !input.divisionFilter && input.classFilter !== "all";
  if (searching && filteredDivision) {
    return "No dogs match this search in this division.";
  }
  if (searching && filteredClass) {
    return "No dogs match this search in this class.";
  }
  if (searching) return "No dogs match this search.";
  if (filteredClass) return "No dogs in this class.";
  return "No dogs in this division.";
}

export function sanitizeRosterDivisionFilter(
  filter: string,
  entries: Array<{ class_id: AdrkClassId; sex: DogSex }>,
): DivisionFilter {
  if (filter === "all") return "all";
  return divisionsWithDogs(entries).some((division) => division.key === filter)
    ? (filter as DivisionFilter)
    : "all";
}

/** @deprecated Compatibility wrapper for old class-only callers. */
export function sanitizeRosterClassFilter(
  filter: string,
  entries: Array<{ class_id: AdrkClassId; sex: DogSex }>,
): string {
  if (!filter.includes(":")) {
    return filter === "all" ||
      entries.some((entry) => entry.class_id === filter)
      ? filter
      : "all";
  }
  return sanitizeRosterDivisionFilter(filter, entries);
}
