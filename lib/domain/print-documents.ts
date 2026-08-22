import type { CritiqueStatus } from "./critique-status";

export type PrintDocKind = "se" | "critique";

export const PRINT_BUNDLE_MAX_ENTRIES = 40;

export function canPrintSe(
  status: "draft" | "complete" | null | undefined,
): boolean {
  return status === "complete";
}

export function canPrintCertificate(
  status: CritiqueStatus | string | null | undefined,
): boolean {
  return status === "APPROVED";
}

export function rowHasPrintableDocument(input: {
  seStatus?: "draft" | "complete" | null;
  critiqueStatus?: CritiqueStatus | string | null;
}): boolean {
  return (
    canPrintSe(input.seStatus) || canPrintCertificate(input.critiqueStatus)
  );
}

export interface PrintableReportRow {
  entryId: string;
  seStatus?: "draft" | "complete" | null;
  critiqueStatus?: CritiqueStatus | string | null;
}

export function printableEntryIdsForDoc(
  rows: PrintableReportRow[],
  doc: PrintDocKind,
  selectedIds: string[],
): string[] {
  const selected = new Set(selectedIds);
  return rows
    .filter((row) => selected.has(row.entryId))
    .filter((row) =>
      doc === "se"
        ? canPrintSe(row.seStatus)
        : canPrintCertificate(row.critiqueStatus),
    )
    .map((row) => row.entryId)
    .slice(0, PRINT_BUNDLE_MAX_ENTRIES);
}

export function selectAllPrintableIds(rows: PrintableReportRow[]): string[] {
  return rows
    .filter((row) => rowHasPrintableDocument(row))
    .map((row) => row.entryId);
}

export function tnrkPrintBundleHref(input: {
  showId: string;
  doc: PrintDocKind;
  entryIds: string[];
}): string {
  const params = new URLSearchParams({
    kind: "bundle",
    show_id: input.showId,
    doc: input.doc,
    entry_ids: input.entryIds.join(","),
  });
  return `/api/pdf/tnrk?${params.toString()}`;
}

export function parsePrintBundleRequest(input: {
  doc: string | null;
  entryIdsRaw: string | null;
}):
  | { ok: true; doc: PrintDocKind; entryIds: string[] }
  | { ok: false; error: string } {
  if (input.doc !== "se" && input.doc !== "critique") {
    return { ok: false, error: "doc must be se or critique" };
  }
  const entryIds = [
    ...new Set(
      (input.entryIdsRaw ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, PRINT_BUNDLE_MAX_ENTRIES);
  if (entryIds.length === 0) {
    return { ok: false, error: "entry_ids required" };
  }
  return { ok: true, doc: input.doc, entryIds };
}

export function printBundleDisabledReason(
  printableCount: number,
  doc: PrintDocKind,
): string | null {
  if (printableCount > 0) return null;
  return doc === "se"
    ? "No complete SE forms in this selection."
    : "No approved certificates in this selection.";
}
