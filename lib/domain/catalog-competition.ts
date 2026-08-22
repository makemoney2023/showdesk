import type { AdrkClassId } from "./adrk-template";
import { dogSexLabel, type DogSex } from "./class-division";

export const CATALOG_CLASSES = [
  { id: "puppy-i", label: "Puppy Class I" },
  { id: "puppy-ii", label: "Puppy Class II" },
  { id: "puppy-iii", label: "Puppy Class III" },
  { id: "youth-i", label: "Youth I" },
  { id: "youth-ii", label: "Youth II" },
  { id: "open", label: "Open" },
  { id: "champion", label: "Champion" },
  { id: "working", label: "Working" },
  { id: "veteran", label: "Veteran" },
] as const;

export type CatalogClassId = (typeof CATALOG_CLASSES)[number]["id"];
export type CatalogEventKind = "se" | "conformation";

export interface CatalogEntryMetadata {
  event_kind?: CatalogEventKind;
  competition_day?: string;
  catalog_class?: CatalogClassId | "standard-evaluation";
}

export interface CompetitionPoolEntry extends CatalogEntryMetadata {
  class_id: AdrkClassId;
  sex: DogSex;
}

export interface CompetitionPool {
  key: string;
  competitionDay: string;
  catalogClass: CatalogClassId;
  sex: DogSex;
  label: string;
  dayLabel: string;
  count: number;
}

const LEGACY_CLASS_MAP: Record<AdrkClassId, CatalogClassId> = {
  babyklasse: "puppy-i",
  juengstenklasse: "puppy-ii",
  "jugendklasse-i": "youth-i",
  "jugendklasse-ii": "youth-ii",
  zwischenklasse: "youth-i",
  "offene-klasse": "open",
  gebrauchshundklasse: "working",
  championklasse: "champion",
  veteranenklasse: "veteran",
};

export function isConformationEntry(
  entry: CatalogEntryMetadata,
): boolean {
  // Local/demo entries predate catalog metadata and remain conformation rows.
  return entry.event_kind !== "se";
}

export function resolvedCatalogClass(
  entry: Pick<CompetitionPoolEntry, "catalog_class" | "class_id">,
): CatalogClassId | null {
  if (
    entry.catalog_class &&
    entry.catalog_class !== "standard-evaluation" &&
    CATALOG_CLASSES.some((item) => item.id === entry.catalog_class)
  ) {
    return entry.catalog_class;
  }
  return LEGACY_CLASS_MAP[entry.class_id] ?? null;
}

export function catalogClassLabel(catalogClass: CatalogClassId): string {
  return (
    CATALOG_CLASSES.find((item) => item.id === catalogClass)?.label ??
    catalogClass
  );
}

export function competitionDayLabel(day: string): string {
  if (!day) return "Unscheduled conformation";
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(year, month - 1, date);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function competitionPoolKey(
  entry: CompetitionPoolEntry,
): string | null {
  if (!isConformationEntry(entry)) return null;
  const catalogClass = resolvedCatalogClass(entry);
  if (!catalogClass) return null;
  return `${entry.competition_day ?? ""}:${catalogClass}:${entry.sex}`;
}

export function competitionPoolLabel(input: {
  catalogClass: CatalogClassId;
  sex: DogSex;
}): string {
  return `${catalogClassLabel(input.catalogClass)} — ${dogSexLabel(input.sex)}`;
}

export function competitionPoolsWithDogs(
  entries: CompetitionPoolEntry[],
): CompetitionPool[] {
  const counts = new Map<string, number>();
  const metadata = new Map<
    string,
    { competitionDay: string; catalogClass: CatalogClassId; sex: DogSex }
  >();
  for (const entry of entries) {
    const key = competitionPoolKey(entry);
    const catalogClass = resolvedCatalogClass(entry);
    if (!key || !catalogClass) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    metadata.set(key, {
      competitionDay: entry.competition_day ?? "",
      catalogClass,
      sex: entry.sex,
    });
  }
  const classOrder = new Map(
    CATALOG_CLASSES.map((item, index) => [item.id, index]),
  );
  return [...metadata.entries()]
    .map(([key, value]) => ({
      key,
      ...value,
      label: competitionPoolLabel(value),
      dayLabel: competitionDayLabel(value.competitionDay),
      count: counts.get(key) ?? 0,
    }))
    .toSorted(
      (a, b) =>
        a.competitionDay.localeCompare(b.competitionDay) ||
        (classOrder.get(a.catalogClass) ?? 99) -
          (classOrder.get(b.catalogClass) ?? 99) ||
        (a.sex === b.sex ? 0 : a.sex === "R" ? -1 : 1),
    );
}
