export type ReviewQueueRow =
  | { kind: "critique"; critiqueId: string }
  | { kind: "editor"; critiqueId: string };

/**
 * Single-column review queue: editor appears directly under the selected dog,
 * not after the full list.
 */
export function buildReviewQueueRows(
  critiqueIds: string[],
  selectedId: string | null,
): ReviewQueueRow[] {
  const rows: ReviewQueueRow[] = [];
  for (const critiqueId of critiqueIds) {
    rows.push({ kind: "critique", critiqueId });
    if (selectedId === critiqueId) {
      rows.push({ kind: "editor", critiqueId });
    }
  }
  return rows;
}

export function tnrkCritiquePdfLabel(): string {
  return "TNRK PDF Preview";
}

export function tnrkCritiquePdfHref(
  showId: string,
  critiqueId: string,
): string {
  return `/api/pdf/tnrk?kind=critique&show_id=${encodeURIComponent(showId)}&critique_id=${encodeURIComponent(critiqueId)}`;
}
