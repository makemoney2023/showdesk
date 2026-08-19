import { describe, expect, it } from "vitest";
import {
  adrkCritiquePdfHref,
  buildReportDocumentsForDog,
  reportDocumentDownloadHref,
  tnrkAwardPdfHref,
} from "./report-documents";

describe("buildReportDocumentsForDog", () => {
  it("lists available PDFs and audio for a dog with full records", () => {
    const docs = buildReportDocumentsForDog({
      showId: "show-1",
      entryId: "entry-1",
      armband: "101",
      critiqueId: "crit-1",
      seEvaluationId: "eval-1",
      hasAudio: true,
    });

    expect(docs.map((d) => d.kind)).toEqual([
      "tnrk_critique",
      "tnrk_se",
      "adrk",
      "award",
      "audio",
    ]);
    expect(docs.every((d) => d.available)).toBe(true);
    expect(docs.find((d) => d.kind === "tnrk_critique")?.href).toContain(
      "kind=critique",
    );
    expect(docs.find((d) => d.kind === "tnrk_se")?.href).toContain("kind=se");
    expect(docs.find((d) => d.kind === "adrk")?.href).toContain(
      "/api/pdf?show_id=show-1",
    );
    expect(docs.find((d) => d.kind === "audio")?.href).toBe("/api/audio/crit-1");
  });

  it("marks missing documents as unavailable but keeps award for roster dogs", () => {
    const docs = buildReportDocumentsForDog({
      showId: "show-1",
      entryId: "entry-1",
      armband: "101",
      critiqueId: null,
      seEvaluationId: null,
      hasAudio: false,
    });

    expect(docs.filter((d) => d.available).map((d) => d.kind)).toEqual([
      "award",
    ]);
    expect(docs.find((d) => d.kind === "tnrk_se")?.available).toBe(false);
    expect(docs.find((d) => d.kind === "tnrk_critique")?.available).toBe(false);
  });

  it("builds award and ADRK hrefs", () => {
    expect(tnrkAwardPdfHref("show-1", "entry-9")).toBe(
      "/api/pdf/tnrk?kind=award&show_id=show-1&entry_id=entry-9",
    );
    expect(adrkCritiquePdfHref("show-1", "crit-2")).toBe(
      "/api/pdf?show_id=show-1&critique_id=crit-2",
    );
  });

  it("adds download=1 for attachment downloads", () => {
    expect(
      reportDocumentDownloadHref(
        "/api/pdf/tnrk?kind=critique&show_id=s&critique_id=c",
      ),
    ).toBe(
      "/api/pdf/tnrk?kind=critique&show_id=s&critique_id=c&download=1",
    );
  });
});
