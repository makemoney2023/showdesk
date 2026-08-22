import { dogRecordMatchesSearch } from "./dog-search";
import { ADRK_CLASSES, type AdrkClassId } from "./adrk-template";
import { classesWithDogs } from "./show-day";

export type RosterClassFilter = "all" | AdrkClassId;
export type RosterSort = "class" | "armband";

export function entryMatchesClassFilter(
  entry: { class_id: string },
  filter: string,
): boolean {
  return filter === "all" || entry.class_id === filter;
}

export function adrkClassIndex(classId: string): number {
  const index = ADRK_CLASSES.findIndex((item) => item.id === classId);
  return index < 0 ? ADRK_CLASSES.length : index;
}

export function compareArmband(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function compareRosterEntries(
  a: { class_id: string; armband: string },
  b: { class_id: string; armband: string },
  sort: RosterSort,
): number {
  const classOrder = adrkClassIndex(a.class_id) - adrkClassIndex(b.class_id);
  const armbandOrder = compareArmband(a.armband, b.armband);
  return sort === "armband"
    ? armbandOrder || classOrder
    : classOrder || armbandOrder;
}

export function visibleRosterEntries<
  T extends {
    class_id: string;
    armband: string;
    dog_name?: string;
    owner?: string;
  },
>(
  entries: T[],
  input: {
    search: string;
    classFilter: string;
    sort?: RosterSort;
  },
): T[] {
  return entries
    .filter((entry) => entryMatchesClassFilter(entry, input.classFilter))
    .filter((entry) => dogRecordMatchesSearch(input.search, entry))
    .toSorted((a, b) =>
      compareRosterEntries(a, b, input.sort ?? "class"),
    );
}

export function rosterEmptyMessage(input: {
  entryCount: number;
  visibleCount: number;
  search: string;
  classFilter: string;
}): string | null {
  if (input.visibleCount > 0) return null;
  if (input.entryCount === 0) return "No dogs on this roster yet.";
  const searching = Boolean(input.search.trim());
  const filteredClass = input.classFilter !== "all";
  if (searching && filteredClass) {
    return "No dogs match this search in this class.";
  }
  if (searching) return "No dogs match this search.";
  return "No dogs in this class.";
}

export function sanitizeRosterClassFilter(
  filter: string,
  entries: { class_id: string }[],
): RosterClassFilter {
  if (filter === "all") return "all";
  return classesWithDogs(entries).includes(filter as AdrkClassId)
    ? (filter as AdrkClassId)
    : "all";
}
