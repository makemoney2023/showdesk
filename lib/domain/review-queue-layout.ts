import {
  divisionLabel,
  dogSexLabel,
  type DogSex,
} from "./class-division";
import type { AdrkClassId } from "./adrk-template";

export type ReviewQueueRow =
  | { kind: "critique"; critiqueId: string }
  | { kind: "editor"; critiqueId: string };

/** Choose the following queue item, falling back to the preceding item. */
export function nextReviewItemId(
  critiqueIds: string[],
  currentId: string,
): string | null {
  const index = critiqueIds.indexOf(currentId);
  if (index < 0) return critiqueIds[0] ?? null;
  return critiqueIds[index + 1] ?? critiqueIds[index - 1] ?? null;
}

export function reviewQueueMatchesSearch(
  query: string,
  critique: { judge?: string; status: string },
  entry?: {
    dog_name: string;
    armband: string;
    owner: string;
    class_id?: AdrkClassId;
    sex?: DogSex;
  },
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry?.dog_name,
    entry?.armband,
    entry?.owner,
    entry?.class_id && entry.sex
      ? divisionLabel(
          { class_id: entry.class_id, sex: entry.sex },
          "short",
        )
      : undefined,
    entry?.sex ? dogSexLabel(entry.sex) : undefined,
    entry?.sex,
    critique.judge,
    critique.status,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

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
  opts?: { preview?: boolean },
): string {
  const params = new URLSearchParams({
    kind: "critique",
    show_id: showId,
    critique_id: critiqueId,
  });
  if (opts?.preview) params.set("preview", "1");
  return `/api/pdf/tnrk?${params.toString()}`;
}

export function tnrkSePdfLabel(): string {
  return "SE PDF Preview";
}

export function tnrkSePdfHref(
  showId: string,
  evaluationId: string,
  opts?: { preview?: boolean },
): string {
  const params = new URLSearchParams({
    kind: "se",
    show_id: showId,
    evaluation_id: evaluationId,
  });
  if (opts?.preview) params.set("preview", "1");
  return `/api/pdf/tnrk?${params.toString()}`;
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
      href: tnrkCritiquePdfHref(input.showId, input.critiqueId, {
        preview: true,
      }),
    },
  ];
  if (input.seEvaluationId) {
    actions.push({
      kind: "se",
      label: tnrkSePdfLabel(),
      href: tnrkSePdfHref(input.showId, input.seEvaluationId, {
        preview: true,
      }),
    });
  }
  return actions;
}
