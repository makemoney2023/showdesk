import type { CatalogClassId } from "./catalog-competition";
import { CATALOG_CLASSES, catalogClassLabel } from "./catalog-competition";
import { dogSexLabel, type DogSex } from "./class-division";

const CHAMPION_PREFIX =
  /\b(ch|gch|grand\s*ch|am\s*ch|can\s*ch|int\s*ch|sieger|siegerin|klubsieger|ks|cacib)\b/i;
const WORKING_SUFFIX =
  /\b(igp\d*|ipo\d*|schh\d*|vpg\d*|bh|fh|ad|mondio|psa|french\s*ring|zvv|ztp)\b/i;

export function hasChampionPrefixTitle(prefixTitles: string): boolean {
  return CHAMPION_PREFIX.test(prefixTitles);
}

export function hasWorkingSuffixTitle(suffixTitles: string): boolean {
  return WORKING_SUFFIX.test(suffixTitles);
}

export function ageInMonths(
  dateOfBirth: string,
  onDate: string,
): number | null {
  const born = parseDate(dateOfBirth);
  const on = parseDate(onDate);
  if (!born || !on || on < born) return null;
  const months =
    (on.getFullYear() - born.getFullYear()) * 12 +
    (on.getMonth() - born.getMonth());
  return on.getDate() < born.getDate() ? months - 1 : months;
}

function parseDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Inclusive min, exclusive max. `maxMonths: null` means no upper bound. */
export const CATALOG_CLASS_AGE_BANDS: Record<
  CatalogClassId,
  { minMonths: number; maxMonths: number | null; ageLabel: string }
> = {
  "puppy-i": { minMonths: 0, maxMonths: 6, ageLabel: "4–6 months" },
  "puppy-ii": { minMonths: 6, maxMonths: 9, ageLabel: "6–9 months" },
  "puppy-iii": { minMonths: 9, maxMonths: 12, ageLabel: "9–12 months" },
  "youth-i": { minMonths: 12, maxMonths: 18, ageLabel: "12–18 months" },
  "youth-ii": { minMonths: 18, maxMonths: 24, ageLabel: "18–24 months" },
  open: { minMonths: 15, maxMonths: null, ageLabel: "from 15 months" },
  champion: { minMonths: 15, maxMonths: null, ageLabel: "from 15 months" },
  working: { minMonths: 15, maxMonths: null, ageLabel: "from 15 months" },
  veteran: { minMonths: 96, maxMonths: null, ageLabel: "from 8 years" },
};

export function isCatalogClassAgeEligible(
  catalogClass: CatalogClassId,
  months: number,
): boolean {
  const band = CATALOG_CLASS_AGE_BANDS[catalogClass];
  if (months < band.minMonths) return false;
  if (band.maxMonths != null && months >= band.maxMonths) return false;
  return true;
}

export function isCatalogClassEligible(input: {
  catalogClass: CatalogClassId;
  dateOfBirth: string;
  onDate: string;
  prefixTitles?: string;
  suffixTitles?: string;
}): boolean {
  const months = ageInMonths(input.dateOfBirth, input.onDate);
  if (months == null) return false;
  if (!isCatalogClassAgeEligible(input.catalogClass, months)) return false;
  if (
    input.catalogClass === "champion" &&
    !hasChampionPrefixTitle(input.prefixTitles ?? "")
  ) {
    return false;
  }
  if (
    input.catalogClass === "working" &&
    !hasWorkingSuffixTitle(input.suffixTitles ?? "")
  ) {
    return false;
  }
  return true;
}

/** Classes this dog may enter. Empty until date of birth is known. */
export function eligibleCatalogClasses(input: {
  dateOfBirth: string;
  onDate: string;
  prefixTitles?: string;
  suffixTitles?: string;
  include?: CatalogClassId | "standard-evaluation";
}): CatalogClassId[] {
  const eligible = CATALOG_CLASSES.map((item) => item.id).filter((id) =>
    isCatalogClassEligible({ ...input, catalogClass: id }),
  );
  const extra =
    input.include &&
    input.include !== "standard-evaluation" &&
    !eligible.includes(input.include)
      ? [input.include]
      : [];
  return [...eligible, ...extra];
}

/** Keep the current class when it is still legal; otherwise use the typical class. */
export function resolvedConformationClass(input: {
  current?: CatalogClassId | "standard-evaluation";
  dateOfBirth: string;
  onDate: string;
  prefixTitles?: string;
  suffixTitles?: string;
}): CatalogClassId | null {
  const eligible = eligibleCatalogClasses(input);
  if (
    input.current &&
    input.current !== "standard-evaluation" &&
    eligible.includes(input.current)
  ) {
    return input.current;
  }
  return suggestCatalogClass(input);
}

export function catalogClassOptionLabel(
  catalogClass: CatalogClassId,
  sex?: DogSex | "",
): string {
  const age = CATALOG_CLASS_AGE_BANDS[catalogClass].ageLabel;
  const className = catalogClassLabel(catalogClass);
  if (sex === "R" || sex === "H") {
    return `${className} — ${dogSexLabel(sex, "full")} · ${age}`;
  }
  return `${className} · ${age}`;
}

/**
 * Suggest the published catalog class from age + titles.
 * Secretary can override; this is a warning, not a hard block.
 */
export function suggestCatalogClass(input: {
  dateOfBirth: string;
  onDate: string;
  prefixTitles?: string;
  suffixTitles?: string;
}): CatalogClassId | null {
  const months = ageInMonths(input.dateOfBirth, input.onDate);
  if (months == null) return null;
  if (months >= 96) return "veteran";
  if (hasChampionPrefixTitle(input.prefixTitles ?? "")) return "champion";
  if (hasWorkingSuffixTitle(input.suffixTitles ?? "") && months >= 15) {
    return "working";
  }
  if (months < 6) return "puppy-i";
  if (months < 9) return "puppy-ii";
  if (months < 12) return "puppy-iii";
  if (months < 18) return "youth-i";
  if (months < 24) return "youth-ii";
  return "open";
}

export function classEligibilityWarning(input: {
  catalogClass: CatalogClassId | "standard-evaluation" | undefined;
  dateOfBirth: string;
  onDate: string;
  prefixTitles?: string;
  suffixTitles?: string;
}): string | null {
  if (!input.catalogClass || input.catalogClass === "standard-evaluation") {
    return null;
  }
  if (
    input.dateOfBirth.trim() &&
    !isCatalogClassEligible({
      catalogClass: input.catalogClass,
      dateOfBirth: input.dateOfBirth,
      onDate: input.onDate,
      prefixTitles: input.prefixTitles,
      suffixTitles: input.suffixTitles,
    })
  ) {
    const months = ageInMonths(input.dateOfBirth, input.onDate);
    const suggested = suggestCatalogClass(input);
    const ageBit = months == null ? "" : ` at ${months} months`;
    const typical = suggested
      ? ` Typical class is ${catalogClassLabel(suggested)}.`
      : "";
    return `${catalogClassLabel(input.catalogClass)} is not eligible${ageBit}.${typical}`;
  }
  const suggested = suggestCatalogClass(input);
  if (!suggested || suggested === input.catalogClass) return null;
  const months = ageInMonths(input.dateOfBirth, input.onDate);
  const ageBit = months == null ? "" : ` at ${months} months`;
  return `${catalogClassLabel(input.catalogClass)} is unusual${ageBit}; typical class is ${catalogClassLabel(suggested)}. You can keep this class.`;
}
