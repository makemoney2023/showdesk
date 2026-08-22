import type { CritiqueStatus } from "./critique-status";
import { dogPhotoHref } from "./dog-photo";
import { canPrintCertificate, canPrintSe } from "./print-documents";
import {
  tnrkCritiquePdfHref,
  tnrkSePdfHref,
} from "./review-queue-layout";

export type ReportDocumentKind =
  | "tnrk_critique"
  | "tnrk_se"
  | "adrk"
  | "award"
  | "audio"
  | "photo";

export interface ReportDocumentLink {
  kind: ReportDocumentKind;
  label: string;
  href: string;
  filename: string;
  available: boolean;
  printable?: boolean;
  unavailableLabel?: string;
}

export function adrkCritiquePdfHref(
  showId: string,
  critiqueId: string,
): string {
  return `/api/pdf?show_id=${encodeURIComponent(showId)}&critique_id=${encodeURIComponent(critiqueId)}`;
}

export function tnrkAwardPdfHref(showId: string, entryId: string): string {
  return `/api/pdf/tnrk?kind=award&show_id=${encodeURIComponent(showId)}&entry_id=${encodeURIComponent(entryId)}`;
}

export function critiqueAudioHref(showId: string, critiqueId: string): string {
  return `/api/audio/${encodeURIComponent(critiqueId)}?show_id=${encodeURIComponent(showId)}`;
}

/** Append download=1 so PDF routes return Content-Disposition: attachment. */
export function reportDocumentDownloadHref(href: string): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("download", "1");
  return `${path}?${params.toString()}`;
}

/**
 * Documents generated for a dog that Reports can view / download.
 * Unavailable items stay listed so the desk sees what's missing.
 */
export function buildReportDocumentsForDog(input: {
  showId: string;
  entryId: string;
  armband: string;
  critiqueId: string | null;
  seEvaluationId: string | null;
  hasAudio: boolean;
  hasPlacement?: boolean;
  hasPhoto?: boolean;
  critiqueStatus?: CritiqueStatus | string | null;
  seStatus?: "draft" | "complete" | null;
}): ReportDocumentLink[] {
  const { showId, entryId, armband, critiqueId, seEvaluationId } = input;
  const docs: ReportDocumentLink[] = [
    {
      kind: "tnrk_critique",
      label: "TNRK critique PDF",
      href: critiqueId
        ? tnrkCritiquePdfHref(showId, critiqueId)
        : "",
      filename: `tnrk-critique-${armband}.pdf`,
      available: Boolean(critiqueId),
      printable: Boolean(critiqueId) && canPrintCertificate(input.critiqueStatus),
    },
    {
      kind: "tnrk_se",
      label: "SE PDF",
      href: seEvaluationId ? tnrkSePdfHref(showId, seEvaluationId) : "",
      filename: `tnrk-se-${entryId}.pdf`,
      available: Boolean(seEvaluationId),
      printable: Boolean(seEvaluationId) && canPrintSe(input.seStatus),
    },
    {
      kind: "adrk",
      label: "ADRK draft PDF",
      href: critiqueId ? adrkCritiquePdfHref(showId, critiqueId) : "",
      filename: `critique-${armband}.pdf`,
      available: Boolean(critiqueId),
    },
    {
      kind: "award",
      label: "Award PDF",
      href: tnrkAwardPdfHref(showId, entryId),
      filename: `tnrk-award-${armband}.pdf`,
      available: Boolean(input.hasPlacement),
    },
    {
      kind: "audio",
      label: "Recording",
      href: critiqueId ? critiqueAudioHref(showId, critiqueId) : "",
      filename: `critique-${armband}.webm`,
      available: Boolean(critiqueId && input.hasAudio),
    },
    {
      kind: "photo",
      label: "Dog photo",
      href: input.hasPhoto ? dogPhotoHref(showId, entryId) : "",
      filename: `dog-${armband}.jpg`,
      available: Boolean(input.hasPhoto),
      unavailableLabel: "No photo yet",
    },
  ];
  return docs;
}
