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

function newestFirst(a: CritiqueRecord, b: CritiqueRecord): number {
  return b.updated_at.localeCompare(a.updated_at);
}

/** Latest critique for ringside status and generic lookups. */
export function newestCritiqueForEntry(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): CritiqueRecord | undefined {
  return [...critiquesForEntry(critiques, entryId, showId)].sort(newestFirst)[0];
}

/**
 * Open critique that SE sync and a later audio recording must reuse.
 * Never returns an approved record — those must not be overwritten.
 */
export function openCritiqueForEntry(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): CritiqueRecord | undefined {
  const forEntry = critiquesForEntry(critiques, entryId, showId);
  return (
    forEntry.find((critique) => critique.status === "PENDING_REVIEW") ??
    forEntry.find((critique) => critique.status === "ERROR") ??
    forEntry.find((critique) => critique.status === "PROCESSING")
  );
}

/**
 * Newest approved certificate. When a dog has this and no open critique,
 * ringside must not record a fresh take — the desk recalls first.
 */
export function approvedCritiqueForEntry(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): CritiqueRecord | undefined {
  return critiquesForEntry(critiques, entryId, showId)
    .filter((critique) => critique.status === "APPROVED")
    .sort(newestFirst)[0];
}

/** Why a new ringside recording is blocked, or null when it can proceed. */
export function recordingBlockedReason(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): string | null {
  const open = openCritiqueForEntry(critiques, entryId, showId);
  if (open) return null;
  const approved = approvedCritiqueForEntry(critiques, entryId, showId);
  if (!approved) return null;
  return approved.delivery_status === "sent"
    ? "Critique already approved and emailed to the owner"
    : "Critique already approved — ask the desk to recall it before re-recording";
}

/**
 * Reports / print: prefer an approved certificate, else the newest row.
 */
export function primaryCritiqueForEntry(
  critiques: CritiqueRecord[],
  entryId: string,
  showId: string,
): CritiqueRecord | undefined {
  const forEntry = critiquesForEntry(critiques, entryId, showId);
  const approved = forEntry
    .filter((critique) => critique.status === "APPROVED")
    .sort(newestFirst)[0];
  return approved ?? newestCritiqueForEntry(critiques, entryId, showId);
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
