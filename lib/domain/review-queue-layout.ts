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

export function tnrkSePdfLabel(): string {
  return "SE PDF Preview";
}

export function tnrkSePdfHref(showId: string, evaluationId: string): string {
  return `/api/pdf/tnrk?kind=se&show_id=${encodeURIComponent(showId)}&evaluation_id=${encodeURIComponent(evaluationId)}`;
}

export type ReviewPdfPreviewAction = {
  kind: "critique" | "se";
  label: string;
  href: string;
};

/** Primary PDF preview buttons for the open review editor. */
export function reviewPdfPreviewActions(input: {
  showId: string;
  critiqueId: string;
  seEvaluationId: string | null;
}): ReviewPdfPreviewAction[] {
  const actions: ReviewPdfPreviewAction[] = [
    {
      kind: "critique",
      label: tnrkCritiquePdfLabel(),
      href: tnrkCritiquePdfHref(input.showId, input.critiqueId),
    },
  ];
  if (input.seEvaluationId) {
    actions.push({
      kind: "se",
      label: tnrkSePdfLabel(),
      href: tnrkSePdfHref(input.showId, input.seEvaluationId),
    });
  }
  return actions;
}
