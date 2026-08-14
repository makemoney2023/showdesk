import type { AdrkClassId } from "./adrk-template";
import type { PlacementRecord } from "@/lib/types";

export interface PlacementInput {
  entry_id: string;
  class_id: AdrkClassId;
  placement: 1 | 2 | 3 | 4 | null;
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
