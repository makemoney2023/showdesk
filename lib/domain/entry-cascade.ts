import type { AppStore, CritiqueRecord } from "@/lib/types";

/** Critiques attached to one roster row (demo + cloud stores). */
export function critiquesForEntry(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): CritiqueRecord[] {
  return critiques.filter(
    (critique) => critique.entry_id === entryId && critique.show_id === showId,
  );
}

/**
 * Wipe a roster row and its critiques, placements, and SE evaluations.
 * Matches Postgres ON DELETE CASCADE so demo file-store behaves the same.
 */
export function removeEntryAndChildren(
  store: AppStore,
  entryId: string,
  showId: string,
): AppStore {
  return {
    ...store,
    entries: store.entries.filter(
      (entry) => !(entry.id === entryId && entry.show_id === showId),
    ),
    critiques: store.critiques.filter(
      (critique) =>
        !(critique.entry_id === entryId && critique.show_id === showId),
    ),
    placements: store.placements.filter(
      (placement) =>
        !(placement.entry_id === entryId && placement.show_id === showId),
    ),
    se_evaluations: (store.se_evaluations ?? []).filter(
      (evaluation) =>
        !(evaluation.entry_id === entryId && evaluation.show_id === showId),
    ),
  };
}
