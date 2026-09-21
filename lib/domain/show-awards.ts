import {
  isConformationEntry,
  resolvedCatalogClass,
  type CatalogClassId,
  type CatalogEntryMetadata,
} from "./catalog-competition";
import type { AdrkClassId } from "./adrk-template";

export type AwardAgeGroup = "puppy" | "youth" | "adult";

export const TNRK_SHOW_AWARDS = [
  {
    id: "best-puppy-male",
    label: "Best Puppy Male",
    groups: ["puppy"],
  },
  {
    id: "best-puppy-female",
    label: "Best Puppy Female",
    groups: ["puppy"],
  },
  {
    id: "best-puppy-in-show",
    label: "Best Puppy in Show",
    groups: ["puppy"],
  },
  {
    id: "youth-sieger",
    label: "Youth Sieger",
    groups: ["youth"],
  },
  {
    id: "youth-siegerin",
    label: "Youth Siegerin",
    groups: ["youth"],
  },
  { id: "sieger", label: "Sieger", groups: ["adult"] },
  { id: "siegerin", label: "Siegerin", groups: ["adult"] },
  {
    id: "best-of-breed",
    label: "Best of Breed",
    groups: ["puppy", "youth", "adult"],
  },
  {
    id: "best-opposite-sex",
    label: "Best Opposite Sex",
    groups: ["puppy", "youth", "adult"],
  },
] as const;

export type TnrkShowAwardId = (typeof TNRK_SHOW_AWARDS)[number]["id"];

const PUPPY_CLASSES = new Set<CatalogClassId>([
  "puppy-i",
  "puppy-ii",
  "puppy-iii",
]);
const YOUTH_CLASSES = new Set<CatalogClassId>(["youth-i", "youth-ii"]);

export function isTnrkShowAwardId(value: unknown): value is TnrkShowAwardId {
  return (
    typeof value === "string" &&
    TNRK_SHOW_AWARDS.some((award) => award.id === value)
  );
}

export function normalizeShowAwards(
  values: Iterable<string | null | undefined> | null | undefined,
): TnrkShowAwardId[] {
  const seen = new Set<TnrkShowAwardId>();
  const awards: TnrkShowAwardId[] = [];
  for (const value of values ?? []) {
    if (!isTnrkShowAwardId(value) || seen.has(value)) continue;
    seen.add(value);
    awards.push(value);
  }
  return awards;
}

export function awardAgeGroupForEntry(entry: {
  event_kind?: CatalogEntryMetadata["event_kind"];
  catalog_class?: CatalogEntryMetadata["catalog_class"];
  class_id?: AdrkClassId | string | null;
}): AwardAgeGroup | null {
  if (!isConformationEntry(entry)) return null;
  const catalogClass = resolvedCatalogClass({
    catalog_class: entry.catalog_class,
    class_id: (entry.class_id ?? "offene-klasse") as AdrkClassId,
  });
  if (!catalogClass) return null;
  if (PUPPY_CLASSES.has(catalogClass)) return "puppy";
  if (YOUTH_CLASSES.has(catalogClass)) return "youth";
  return "adult";
}

export function awardsForEntry(entry: {
  event_kind?: CatalogEntryMetadata["event_kind"];
  catalog_class?: CatalogEntryMetadata["catalog_class"];
  class_id?: AdrkClassId | string | null;
}): Array<(typeof TNRK_SHOW_AWARDS)[number]> {
  const group = awardAgeGroupForEntry(entry);
  if (!group) return [];
  return TNRK_SHOW_AWARDS.filter((award) =>
    (award.groups as readonly AwardAgeGroup[]).includes(group),
  );
}

export function toggleShowAward(
  selected: Iterable<string | null | undefined>,
  awardId: TnrkShowAwardId,
): TnrkShowAwardId[] {
  const current = normalizeShowAwards(selected);
  return current.includes(awardId)
    ? current.filter((id) => id !== awardId)
    : [...current, awardId];
}

export function formatShowAwardLabels(
  values: Iterable<string | null | undefined> | null | undefined,
): string[] {
  const selected = new Set(normalizeShowAwards(values));
  return TNRK_SHOW_AWARDS.filter((award) => selected.has(award.id)).map(
    (award) => award.label,
  );
}
