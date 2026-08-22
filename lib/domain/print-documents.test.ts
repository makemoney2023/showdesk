import { describe, expect, it } from "vitest";
import {
  PRINT_BUNDLE_MAX_ENTRIES,
  canPrintCertificate,
  canPrintSe,
  parsePrintBundleRequest,
  canServeDeskPdf,
  printBundleDisabledReason,
  printableEntryIdsForDoc,
  rowHasPrintableDocument,
  selectAllPrintableIds,
  tnrkPrintBundleHref,
  withPdfPreviewFlag,
} from "./print-documents";

const rows = [
  { entryId: "a", seStatus: "complete" as const, critiqueStatus: "PENDING_REVIEW" },
  { entryId: "b", seStatus: "draft" as const, critiqueStatus: "APPROVED" },
  { entryId: "c", seStatus: "draft" as const, critiqueStatus: "PENDING_REVIEW" },
];

describe("print eligibility", () => {
  it("allows complete SE forms and approved certificates only", () => {
    expect(canPrintSe("complete")).toBe(true);
    expect(canPrintSe("draft")).toBe(false);
    expect(canPrintSe(null)).toBe(false);
    expect(canPrintCertificate("APPROVED")).toBe(true);
    expect(canPrintCertificate("PENDING_REVIEW")).toBe(false);
    expect(rowHasPrintableDocument(rows[0])).toBe(true);
    expect(rowHasPrintableDocument(rows[2])).toBe(false);
  });

  it("selects printable ids for the chosen document type", () => {
    expect(printableEntryIdsForDoc(rows, "se", ["a", "b", "c"])).toEqual(["a"]);
    expect(printableEntryIdsForDoc(rows, "critique", ["a", "b"])).toEqual(["b"]);
    expect(selectAllPrintableIds(rows)).toEqual(["a", "b"]);
  });

  it("caps a bundle at 40 entry ids", () => {
    const many = Array.from({ length: 45 }, (_, i) => `e${i}`);
    const parsed = parsePrintBundleRequest({
      doc: "se",
      entryIdsRaw: many.join(","),
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.entryIds).toHaveLength(PRINT_BUNDLE_MAX_ENTRIES);
    }
  });

  it("builds a bundle href and rejects a bad request", () => {
    expect(
      tnrkPrintBundleHref({
        showId: "show-1",
        doc: "se",
        entryIds: ["a", "b"],
      }),
    ).toBe(
      "/api/pdf/tnrk?kind=bundle&show_id=show-1&doc=se&entry_ids=a%2Cb",
    );
    expect(parsePrintBundleRequest({ doc: "award", entryIdsRaw: "a" }).ok).toBe(
      false,
    );
    expect(parsePrintBundleRequest({ doc: "se", entryIdsRaw: "" }).ok).toBe(
      false,
    );
  });

  it("explains why a print action is disabled", () => {
    expect(printBundleDisabledReason(0, "se")).toBe(
      "No complete SE forms in this selection.",
    );
    expect(printBundleDisabledReason(0, "critique")).toBe(
      "No approved certificates in this selection.",
    );
    expect(printBundleDisabledReason(2, "se")).toBeNull();
  });

  it("serves printable PDFs freely and drafts only with preview=1", () => {
    expect(canServeDeskPdf({ printable: true, preview: false })).toBe(true);
    expect(canServeDeskPdf({ printable: false, preview: true })).toBe(true);
    expect(canServeDeskPdf({ printable: false, preview: false })).toBe(false);
    expect(withPdfPreviewFlag("/api/pdf/tnrk?kind=se&show_id=s&evaluation_id=e")).toBe(
      "/api/pdf/tnrk?kind=se&show_id=s&evaluation_id=e&preview=1",
    );
  });
});
