import { dogRecordMatchesSearch } from "./dog-search";
import { ADRK_CLASSES, type AdrkClassId } from "./adrk-template";
import {
  classDivisionIndex,
  divisionsWithDogs,
  entryMatchesDivision,
  type DivisionFilter,
  type DogSex,
} from "./class-division";
import type { CatalogEventKind } from "./catalog-competition";
import type { ShowWeekend } from "./show-weekend";
import { weekendDayKind } from "./show-weekend";
import {
  conformationDaysForDog,
  seConformationAsterisk,
} from "./dog-identity";

export type RosterSort = "class" | "armband";
export type RosterTab = "se" | "saturday" | "sunday" | "all";

export function rosterTabForEntry(
  entry: { event_kind?: CatalogEventKind; competition_day?: string },
  weekend: ShowWeekend,
): Exclude<RosterTab, "all"> | null {
  if (entry.event_kind === "se") return "se";
  const kind = weekendDayKind(weekend, entry.competition_day);
  if (kind === "saturday" || kind === "sunday") return kind;
  return entry.event_kind === "conformation" ? "saturday" : null;
}

export function entriesForRosterTab<
  T extends { event_kind?: CatalogEventKind; competition_day?: string },
>(entries: T[], tab: RosterTab, weekend: ShowWeekend): T[] {
  if (tab === "all") return entries;
  return entries.filter((entry) => rosterTabForEntry(entry, weekend) === tab);
}

export function seRosterNote<
  T extends {
    id: string;
    show_id: string;
    dog_id?: string;
    event_kind?: CatalogEventKind;
    competition_day?: string;
  },
>(entry: T, entries: T[], weekend: ShowWeekend): string | null {
  if (entry.event_kind !== "se") return null;
  return seConformationAsterisk(
    conformationDaysForDog(entries, entry, weekend),
  );
}

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
  tab?: RosterTab;
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
  if (input.tab === "se") return "No dogs in the SE division.";
  if (input.tab === "saturday" || input.tab === "sunday") {
    return "No dogs entered on this day.";
  }
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
