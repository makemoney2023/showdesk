import {
  ADRK_FORMWERT_CODES,
  type AdrkClassId,
  type AdrkFormwertCode,
} from "./adrk-template";
import type { PlacementRecord } from "@/lib/types";

export interface PlacementInput {
  entry_id: string;
  class_id: AdrkClassId;
  placement: 1 | 2 | 3 | 4 | null;
}

export function placementEntriesBelongToShow(
  rows: PlacementInput[],
  entries: Array<{ id: string; show_id: string; class_id: AdrkClassId }>,
  showId: string,
): { valid: true } | { valid: false; error: string } {
  const byId = new Map(
    entries
      .filter((entry) => entry.show_id === showId)
      .map((entry) => [entry.id, entry]),
  );
  for (const row of rows) {
    const entry = byId.get(row.entry_id);
    if (!entry) {
      return { valid: false, error: `Unknown entry for this show: ${row.entry_id}` };
    }
    if (entry.class_id !== row.class_id) {
      return {
        valid: false,
        error: `class_id mismatch for entry ${row.entry_id}`,
      };
    }
  }
  return { valid: true };
}

export function upsertPlacements(
  existing: PlacementRecord[],
  showId: string,
  rows: PlacementInput[],
  newId: () => string,
): PlacementRecord[] {
  const otherShows = existing.filter((p) => p.show_id !== showId);
  const touched = new Set(rows.map((r) => r.entry_id));
  const keptForShow = existing.filter(
    (p) => p.show_id === showId && !touched.has(p.entry_id),
  );
  const added: PlacementRecord[] = [];
  for (const row of rows) {
    if (row.placement === null) continue;
    if (![1, 2, 3, 4].includes(row.placement)) continue;
    added.push({
      id: newId(),
      show_id: showId,
      class_id: row.class_id,
      entry_id: row.entry_id,
      placement: row.placement,
    });
  }
  return [...otherShows, ...keptForShow, ...added];
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
 * Suggest placements 1–4 per class from Formwert order.
 * Only rated dogs receive a placement; unrated clear to null.
 */
/**
 * Assign a 1–4 place to a dog. Tapping the same place clears it.
 * If another dog in the class already holds that place, they swap.
 */
export function assignClassPlacement(
  current: Record<string, number | "">,
  entryId: string,
  place: 1 | 2 | 3 | 4,
  classEntryIds: string[],
): Record<string, number | ""> {
  const next: Record<string, number | ""> = { ...current };
  if (next[entryId] === place) {
    next[entryId] = "";
    return next;
  }
  const other = classEntryIds.find(
    (id) => id !== entryId && next[id] === place,
  );
  if (other) {
    next[other] = next[entryId] ?? "";
  }
  next[entryId] = place;
  return next;
}

export function placementsSuggestedFromFormwert<
  T extends { id: string; armband: string; class_id: AdrkClassId },
>(
  dogs: T[],
  formwertByEntry: Record<string, AdrkFormwertCode | null | undefined>,
): PlacementInput[] {
  const byClass = new Map<AdrkClassId, T[]>();
  for (const dog of dogs) {
    const list = byClass.get(dog.class_id) ?? [];
    list.push(dog);
    byClass.set(dog.class_id, list);
  }

  const suggested: PlacementInput[] = [];
  for (const [classId, classDogs] of byClass) {
    const ordered = sortDogsForPlacement(classDogs, formwertByEntry);
    const rated = ordered.filter((dog) => formwertByEntry[dog.id]);
    const placementById = new Map<string, 1 | 2 | 3 | 4>();
    rated.slice(0, 4).forEach((dog, index) => {
      placementById.set(dog.id, (index + 1) as 1 | 2 | 3 | 4);
    });
    for (const dog of ordered) {
      suggested.push({
        entry_id: dog.id,
        class_id: classId,
        placement: placementById.get(dog.id) ?? null,
      });
    }
  }
  return suggested;
}
