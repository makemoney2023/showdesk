import { canPrintSe } from "./print-documents";
import {
  normalizeTnrkSeForm,
  seFormHasPrintableOverlay,
} from "./tnrk-se-form";

export type PublicPdfKind = "critique" | "se" | "award";

export type PublicPdfRequest =
  | { kind: "critique"; showId: string; critiqueId: string }
  | { kind: "se"; showId: string; evaluationId: string }
  | { kind: "award"; showId: string; entryId: string };

export function publicCritiquePdfHref(
  showId: string,
  critiqueId: string,
): string {
  const params = new URLSearchParams({
    kind: "critique",
    show_id: showId,
    critique_id: critiqueId,
  });
  return `/api/public/pdf?${params.toString()}`;
}

export function publicSePdfHref(showId: string, evaluationId: string): string {
  const params = new URLSearchParams({
    kind: "se",
    show_id: showId,
    evaluation_id: evaluationId,
  });
  return `/api/public/pdf?${params.toString()}`;
}

export function publicAwardPdfHref(showId: string, entryId: string): string {
  const params = new URLSearchParams({
    kind: "award",
    show_id: showId,
    entry_id: entryId,
  });
  return `/api/public/pdf?${params.toString()}`;
}

/** Official SE PDFs: completed forms, or filled forms that already have a result. */
export function canPublishSePdf(
  se: { status?: string | null; form?: unknown } | null | undefined,
): boolean {
  if (!se) return false;
  if (canPrintSe(se.status)) return true;
  const form = normalizeTnrkSeForm(se.form);
  return Boolean(form.final_result) && seFormHasPrintableOverlay(form);
}

export function parsePublicPdfRequest(input: {
  kind: string | null;
  showId: string | null;
  critiqueId: string | null;
  evaluationId: string | null;
  entryId: string | null;
}): PublicPdfRequest | { error: string } {
  const showId = input.showId?.trim() ?? "";
  if (!showId) return { error: "show_id required" };

  if (input.kind === "critique") {
    const critiqueId = input.critiqueId?.trim() ?? "";
    if (!critiqueId) return { error: "critique_id required" };
    return { kind: "critique", showId, critiqueId };
  }
  if (input.kind === "se") {
    const evaluationId = input.evaluationId?.trim() ?? "";
    if (!evaluationId) return { error: "evaluation_id required" };
    return { kind: "se", showId, evaluationId };
  }
  if (input.kind === "award") {
    const entryId = input.entryId?.trim() ?? "";
    if (!entryId) return { error: "entry_id required" };
    return { kind: "award", showId, entryId };
  }
  return { error: "kind must be critique, se, or award" };
}
