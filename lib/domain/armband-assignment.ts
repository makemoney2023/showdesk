import type { CatalogClassId, CatalogEventKind } from "./catalog-competition";
import { CATALOG_CLASSES } from "./catalog-competition";

export type ArmbandMode = "sequential" | "random";

export interface ArmbandAppearance {
  event_kind?: CatalogEventKind;
  competition_day?: string;
  catalog_class?: CatalogClassId | "standard-evaluation";
  armband: string;
  dog_id?: string;
}

export interface ShowWeekendDays {
  se: string;
  saturday: string;
  sunday: string;
}

export interface EntryDays {
  se: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface AssignedArmbands {
  se?: string;
  saturday?: string;
  sunday?: string;
}

const CLASS_ORDER = new Map(
  CATALOG_CLASSES.map((item, index) => [item.id, index]),
);

export function parseArmbandNumber(value: string): number | null {
  const match = /^(\d+)$/.exec(value.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function usedArmbandNumbers(entries: ArmbandAppearance[]): Set<number> {
  const used = new Set<number>();
  for (const entry of entries) {
    const number = parseArmbandNumber(entry.armband);
    if (number != null) used.add(number);
  }
  return used;
}

export function distinctDogCount(entries: Array<{ dog_id?: string; id?: string }>): number {
  const ids = new Set<string>();
  for (const entry of entries) {
    ids.add(entry.dog_id?.trim() || entry.id || `row-${ids.size}`);
  }
  return ids.size;
}

/**
 * Random range is based on dogs in the show, expanded when multi-day
 * appearances need more unique numbers than there are dogs.
 */
export function armbandRangeMax(input: {
  existing: ArmbandAppearance[];
  newUniqueSlots: number;
}): number {
  const used = usedArmbandNumbers(input.existing);
  const highest = used.size === 0 ? 0 : Math.max(...used);
  const dogs = distinctDogCount(input.existing);
  return Math.max(
    dogs + (input.newUniqueSlots > 0 ? 1 : 0),
    highest,
    used.size + input.newUniqueSlots,
    input.newUniqueSlots,
  );
}

export function uniqueSlotsNeeded(days: EntryDays): number {
  const conformationDays = Number(days.saturday) + Number(days.sunday);
  if (conformationDays > 0) return conformationDays;
  return days.se ? 1 : 0;
}

function nextUnused(used: Set<number>, from = 1): number {
  let candidate = from;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

function pickRandomUnused(
  used: Set<number>,
  rangeMax: number,
  random: () => number,
): number {
  const available: number[] = [];
  for (let n = 1; n <= rangeMax; n += 1) {
    if (!used.has(n)) available.push(n);
  }
  if (available.length === 0) return nextUnused(used);
  const index = Math.min(
    available.length - 1,
    Math.floor(random() * available.length),
  );
  return available[index] ?? nextUnused(used);
}

/**
 * Assign armbands for a new dog.
 * Sequential is show-wide (does not restart per day), allocated Sat then Sun.
 * SE reuses Saturday's conformation number when present, else Sunday.
 * SE-only dogs get their own number.
 */
export function assignArmbands(input: {
  existing: ArmbandAppearance[];
  days: EntryDays;
  mode: ArmbandMode;
  random?: () => number;
}): AssignedArmbands {
  const days = input.days;
  if (!days.se && !days.saturday && !days.sunday) return {};

  const used = usedArmbandNumbers(input.existing);
  const slots = uniqueSlotsNeeded(days);
  const rangeMax = armbandRangeMax({
    existing: input.existing,
    newUniqueSlots: slots,
  });
  const take = (): string => {
    const number =
      input.mode === "random"
        ? pickRandomUnused(used, rangeMax, input.random ?? Math.random)
        : nextUnused(used);
    used.add(number);
    return String(number);
  };

  const assigned: AssignedArmbands = {};
  if (days.saturday) assigned.saturday = take();
  if (days.sunday) assigned.sunday = take();
  if (days.se) {
    assigned.se = assigned.saturday ?? assigned.sunday ?? take();
  }
  return assigned;
}

export function catalogClassSortIndex(
  catalogClass: CatalogClassId | "standard-evaluation" | undefined,
): number {
  if (!catalogClass || catalogClass === "standard-evaluation") return 99;
  return CLASS_ORDER.get(catalogClass) ?? 99;
}
