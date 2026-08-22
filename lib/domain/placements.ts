import {
  ADRK_FORMWERT_CODES,
  type AdrkClassId,
  type AdrkFormwertCode,
} from "./adrk-template";
import { type DogSex } from "./class-division";
import {
  competitionPoolKey,
  isConformationEntry,
  resolvedCatalogClass,
  type CatalogClassId,
  type CatalogEntryMetadata,
} from "./catalog-competition";
import type { PlacementRecord } from "@/lib/types";

export interface PlacementInput {
  entry_id: string;
  placement: 1 | 2 | 3 | 4 | null;
}

export interface ResolvedPlacementInput extends PlacementInput {
  class_id: AdrkClassId;
  sex: DogSex;
  competition_day: string;
  catalog_class: CatalogClassId;
}

export function resolvePlacementInputs(
  rows: PlacementInput[],
  entries: Array<{
    id: string;
    show_id: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata>,
  showId: string,
):
  | { valid: true; rows: ResolvedPlacementInput[] }
  | { valid: false; error: string } {
  const byId = new Map(
    entries
      .filter((entry) => entry.show_id === showId)
      .map((entry) => [entry.id, entry]),
  );
  const entryIds = new Set<string>();
  const occupiedSlots = new Map<string, string>();
  const resolved: ResolvedPlacementInput[] = [];
  const catalogMode = [...byId.values()].some(
    (entry) =>
      entry.event_kind != null ||
      entry.competition_day != null ||
      entry.catalog_class != null,
  );
  for (const row of rows) {
    const entry = byId.get(row.entry_id);
    if (!entry) {
      return { valid: false, error: `Unknown entry for this show: ${row.entry_id}` };
    }
    if (entryIds.has(row.entry_id)) {
      return {
        valid: false,
        error: `Duplicate placement row for entry ${row.entry_id}`,
      };
    }
    entryIds.add(row.entry_id);
    if (
      row.placement !== null &&
      !([1, 2, 3, 4] as const).includes(row.placement)
    ) {
      return { valid: false, error: "placement must be 1–4 or null" };
    }
    if (row.placement !== null) {
      if (!isConformationEntry(entry)) {
        return {
          valid: false,
          error: `Standard Evaluation entry cannot receive a placement: ${row.entry_id}`,
        };
      }
      const catalogClass = resolvedCatalogClass(entry);
      const pool = competitionPoolKey(entry);
      if (
        !catalogClass ||
        !pool ||
        (catalogMode && !entry.competition_day)
      ) {
        return {
          valid: false,
          error: `Entry is missing catalog day/class: ${row.entry_id}`,
        };
      }
      const slot = `${pool}:${row.placement}`;
      const occupiedBy = occupiedSlots.get(slot);
      if (occupiedBy) {
        return {
          valid: false,
          error: `Place ${row.placement} is already assigned in ${pool}`,
        };
      }
      occupiedSlots.set(slot, row.entry_id);
    }
    const catalogClass =
      resolvedCatalogClass(entry) ??
      // Null-placement SE rows are accepted in a full-show replacement and
      // skipped by upsertPlacements.
      "open";
    resolved.push({
      ...row,
      class_id: entry.class_id,
      sex: entry.sex,
      competition_day: entry.competition_day ?? "",
      catalog_class: catalogClass,
    });
  }
  return { valid: true, rows: resolved };
}

/** @deprecated Compatibility boolean for older domain callers. */
export function placementEntriesBelongToShow(
  rows: Array<PlacementInput & { class_id?: AdrkClassId }>,
  entries: Array<{
    id: string;
    show_id: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata>,
  showId: string,
): { valid: true } | { valid: false; error: string } {
  for (const row of rows) {
    const entry = entries.find(
      (item) => item.id === row.entry_id && item.show_id === showId,
    );
    if (entry && row.class_id && entry.class_id !== row.class_id) {
      return {
        valid: false,
        error: `class_id mismatch for entry ${row.entry_id}`,
      };
    }
  }
  const resolved = resolvePlacementInputs(rows, entries, showId);
  return resolved.valid ? { valid: true } : resolved;
}

export function upsertPlacements(
  existing: PlacementRecord[],
  showId: string,
  rows: ResolvedPlacementInput[],
  newId: () => string,
): PlacementRecord[] {
  const otherShows = existing.filter((p) => p.show_id !== showId);
  const added: PlacementRecord[] = [];
  for (const row of rows) {
    if (row.placement === null) continue;
    if (![1, 2, 3, 4].includes(row.placement)) continue;
    added.push({
      id: newId(),
      show_id: showId,
      class_id: row.class_id,
      sex: row.sex,
      competition_day: row.competition_day,
      catalog_class: row.catalog_class,
      entry_id: row.entry_id,
      placement: row.placement,
    });
  }
  // PUT is a full-show replacement. Omitted rows are cleared, never silently
  // preserved into a duplicate class/sex placement slot.
  return [...otherShows, ...added];
}

/** Lower rank = better Formwert. Unrated / unknown sort last. */
export function formwertSortRank(
  code: AdrkFormwertCode | null | undefined,
): number {
  if (!code) return ADRK_FORMWERT_CODES.length;
  const index = ADRK_FORMWERT_CODES.indexOf(code);
  return index === -1 ? ADRK_FORMWERT_CODES.length : index;
}

export function resolveFormwertByEntryId(
  critiques: Array<{
    entry_id: string;
    updated_at: string;
    draft: { formwert: AdrkFormwertCode | null };
  }>,
): Record<string, AdrkFormwertCode | null> {
  const newest = new Map<
    string,
    { formwert: AdrkFormwertCode | null; updated_at: string }
  >();
  for (const critique of critiques) {
    const prev = newest.get(critique.entry_id);
    if (!prev || critique.updated_at > prev.updated_at) {
      newest.set(critique.entry_id, {
        formwert: critique.draft.formwert,
        updated_at: critique.updated_at,
      });
    }
  }
  const out: Record<string, AdrkFormwertCode | null> = {};
  for (const [entryId, value] of newest) {
    out[entryId] = value.formwert;
  }
  return out;
}

/** Sort dogs best Formwert first; ties by numeric armband; unrated last. */
export function sortDogsForPlacement<
  T extends { id: string; armband: string },
>(
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): T[] {
  return [...dogs].toSorted((a, b) => {
    const rankDiff =
      formwertSortRank(formwertByEntry[a.id]) -
      formwertSortRank(formwertByEntry[b.id]);
    if (rankDiff !== 0) return rankDiff;
    return a.armband.localeCompare(b.armband, undefined, { numeric: true });
  });
}

/**
 * Suggest placements 1–4 per class/sex division from Formwert order.
 * Only rated dogs receive a placement; unrated clear to null.
 */
/**
 * Assign a 1–4 place to a dog. Tapping the same place clears it.
 * If another dog in the division already holds that place, they swap.
 */
export function assignClassPlacement(
  current: Record<string, number | "">,
  entryId: string,
  place: 1 | 2 | 3 | 4,
  divisionEntryIds: string[],
): Record<string, number | ""> {
  const next: Record<string, number | ""> = { ...current };
  if (next[entryId] === place) {
    next[entryId] = "";
    return next;
  }
  const other = divisionEntryIds.find(
    (id) => id !== entryId && next[id] === place,
  );
  if (other) {
    next[other] = next[entryId] ?? "";
  }
  next[entryId] = place;
  return next;
}

export function placementsSuggestedFromFormwert<
  T extends {
    id: string;
    armband: string;
    class_id: AdrkClassId;
    sex: DogSex;
  } & CatalogEntryMetadata,
>(
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): PlacementInput[] {
  const byDivision = new Map<string, T[]>();
  for (const dog of dogs) {
    const key = competitionPoolKey(dog);
    if (!key) continue;
    const list = byDivision.get(key) ?? [];
    list.push(dog);
    byDivision.set(key, list);
  }

  const suggested: PlacementInput[] = [];
  for (const divisionDogs of byDivision.values()) {
    const ordered = sortDogsForPlacement(divisionDogs, formwertByEntry);
    const rated = ordered.filter((dog) => formwertByEntry[dog.id]);
    const placementById = new Map<string, 1 | 2 | 3 | 4>();
    rated.slice(0, 4).forEach((dog, index) => {
      placementById.set(dog.id, (index + 1) as 1 | 2 | 3 | 4);
    });
    for (const dog of ordered) {
      suggested.push({
        entry_id: dog.id,
        placement: placementById.get(dog.id) ?? null,
      });
    }
  }
  return suggested;
}
