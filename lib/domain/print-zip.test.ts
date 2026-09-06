import { describe, expect, it, vi } from "vitest";
import { buildReportDocumentsForDog } from "./report-documents";
import {
  buildPrintZipBytes,
  collectPrintZipItems,
  printZipArchiveName,
  printZipDisabledReason,
  printZipFilePath,
} from "./print-zip";

function docsFor(input: {
  critiqueStatus?: "APPROVED" | "PENDING_REVIEW";
  seStatus?: "complete" | "draft";
  hasPlacement?: boolean;
}) {
  return buildReportDocumentsForDog({
    showId: "show-1",
    entryId: "entry-1",
    armband: "7",
    critiqueId: "crit-1",
    seEvaluationId: "eval-1",
    hasAudio: false,
    hasPlacement: input.hasPlacement ?? false,
    critiqueStatus: input.critiqueStatus ?? "APPROVED",
    seStatus: input.seStatus ?? "complete",
  });
}

describe("print zip naming", () => {
  it("puts official PDFs in print-shop folders named by armband", () => {
    expect(
      printZipFilePath({
        armband: "7",
        dogName: "Epic Rr Femme Fatale Diva",
        kind: "tnrk_critique",
      }),
    ).toBe("certificates/7-epic-rr-femme-fatale-diva-critique.pdf");
    expect(
      printZipFilePath({
        armband: "101",
        dogName: "Rex vom Blacksage",
        kind: "tnrk_se",
      }),
    ).toBe("se-forms/101-rex-vom-blacksage-se.pdf");
    expect(
      printZipFilePath({
        armband: "8",
        dogName: "Bella",
        kind: "award",
      }),
    ).toBe("awards/8-bella-award.pdf");
  });

  it("names the archive from the show", () => {
    expect(printZipArchiveName("TNRK Sieger Show 2026")).toBe(
      "tnrk-sieger-show-2026-print-pdfs.zip",
    );
    expect(printZipArchiveName("")).toBe("show-print-pdfs.zip");
  });
});

describe("collectPrintZipItems", () => {
  const approved = {
    entryId: "a",
    armband: "7",
    dogName: "Rex",
    documents: docsFor({
      critiqueStatus: "APPROVED",
      seStatus: "complete",
      hasPlacement: true,
    }),
  };
  const draft = {
    entryId: "b",
    armband: "8",
    dogName: "Bella",
    documents: docsFor({
      critiqueStatus: "PENDING_REVIEW",
      seStatus: "draft",
      hasPlacement: false,
    }),
  };

  it("includes approved critiques, complete SE forms, and awards", () => {
    const items = collectPrintZipItems([approved], []);
    expect(items.map((item) => item.path)).toEqual([
      "certificates/7-rex-critique.pdf",
      "se-forms/7-rex-se.pdf",
      "awards/7-rex-award.pdf",
    ]);
    expect(items.every((item) => item.href)).toBe(true);
  });

  it("skips drafts, ADRK, audio, and photos", () => {
    expect(collectPrintZipItems([draft], [])).toEqual([]);
  });

  it("uses the current selection when dogs are checked", () => {
    const items = collectPrintZipItems([approved, draft], ["b"]);
    expect(items).toEqual([]);
    expect(collectPrintZipItems([approved, draft], ["a"]).map((i) => i.path)).toEqual([
      "certificates/7-rex-critique.pdf",
      "se-forms/7-rex-se.pdf",
      "awards/7-rex-award.pdf",
    ]);
  });

  it("explains when there is nothing to zip", () => {
    expect(printZipDisabledReason(0)).toMatch(/No approved certificates/);
    expect(printZipDisabledReason(2)).toBeNull();
  });
});

describe("buildPrintZipBytes", () => {
  it("packs fetched PDFs and records failed paths", async () => {
    const items = [
      { path: "certificates/7-rex-critique.pdf", href: "/ok" },
      { path: "se-forms/7-rex-se.pdf", href: "/missing" },
    ];
    const fetchPdf = vi.fn(async (href: string) => {
      if (href === "/missing") throw new Error("404");
      return new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    });
    const progress: number[] = [];
    const { bytes, failed } = await buildPrintZipBytes({
      items,
      fetchPdf,
      onProgress: (done, total) => progress.push(done / total),
    });
    expect(failed).toEqual(["se-forms/7-rex-se.pdf"]);
    expect(bytes.byteLength).toBeGreaterThan(20);
    expect(progress).toEqual([0.5, 1]);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toContain("certificates/7-rex-critique.pdf");
    expect(zip.files["se-forms/7-rex-se.pdf"]).toBeUndefined();
  });
});
