import type { CatalogClassId } from "./catalog-competition";
import { catalogClassLabel } from "./catalog-competition";

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
  const suggested = suggestCatalogClass(input);
  if (!suggested || suggested === input.catalogClass) return null;
  const months = ageInMonths(input.dateOfBirth, input.onDate);
  const ageBit = months == null ? "" : ` at ${months} months`;
  return `${catalogClassLabel(input.catalogClass)} is unusual${ageBit}; typical class is ${catalogClassLabel(suggested)}. You can keep this class.`;
}
