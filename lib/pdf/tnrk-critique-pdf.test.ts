import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractPdfText, pdfContainsText } from "./pdf-text";
import {
  TNRK_CRITIQUE_FIELD_TOP,
  TNRK_CRITIQUE_FIELD_X,
  TNRK_CRITIQUE_NARRATIVE_SIZE,
  TNRK_TEMPLATE_LABELS,
  buildTnrkCritiquePdf,
  centeredTextX,
  resolveCritiqueCertificateNarrative,
} from "./tnrk-critique-pdf";

describe("resolveCritiqueCertificateNarrative", () => {
  it("prefers editable draft narrative", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: " Edited narrative ",
        transcript: "Raw STT",
      }),
    ).toBe("Edited narrative");
  });

  it("falls back to transcript when draft narrative is empty", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "  ",
        transcript: "Live STT body",
      }),
    ).toBe("Live STT body");
  });

  it("does not use SE form text on the critique certificate", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "Strong male. Head: strong_typey. SE result: PASS.",
        transcript: "Ringside SE form",
        seReplacementDraft: true,
      }),
    ).toBe("");
  });

  it("uses spoken STT when the draft was replaced by the SE form", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "SE overall appearance only",
        transcript: "Medium size, excellent gait.",
        seReplacementDraft: true,
      }),
    ).toBe("Medium size, excellent gait.");
  });

  it("strips an appended SE section from a secretary-edited letter", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative:
          "Edited STT letter\n\n— SE form —\nStrong male\n\nSE result: PASS.",
        transcript: "Raw STT",
      }),
    ).toBe("Edited STT letter");
  });
});

describe("tnrk-critique-pdf layout", () => {
  it("places fill-ins below label bands (not on CRITIQUE title)", () => {
    expect(TNRK_CRITIQUE_FIELD_TOP.dog_name).toBeGreaterThan(200);
    expect(TNRK_CRITIQUE_FIELD_TOP.dog_name).toBeLessThan(210);
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeGreaterThan(
      TNRK_CRITIQUE_FIELD_TOP.dog_name,
    );
    expect(TNRK_CRITIQUE_FIELD_TOP.class_and_rating).toBeGreaterThan(440);
    expect(TNRK_CRITIQUE_FIELD_X.dog_name).toBeGreaterThan(184);
    expect(TNRK_CRITIQUE_FIELD_X.dob).toBeGreaterThan(
      TNRK_TEMPLATE_LABELS.gebDatum.x1,
    );
    expect(TNRK_CRITIQUE_FIELD_X.dob).toBeLessThan(
      TNRK_TEMPLATE_LABELS.armbandNr.x0,
    );
    expect(TNRK_CRITIQUE_FIELD_X.armband).toBeGreaterThan(
      TNRK_TEMPLATE_LABELS.armbandNr.x1,
    );
  });

  it("keeps a compact DOB inside the gap before ARMBAND-NR", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const widest = "12/31/2026";
    const width = font.widthOfTextAtSize(widest, 10);
    expect(TNRK_CRITIQUE_FIELD_X.dob + width).toBeLessThan(
      TNRK_TEMPLATE_LABELS.armbandNr.x0,
    );
  });

  it("shifts the critique 20% lower to clear certificate print", () => {
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBe(Math.round(258 * 1.2));
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeLessThan(
      TNRK_CRITIQUE_FIELD_TOP.class_and_rating,
    );
  });

  it("centers text on the page width", async () => {
    const pdf = await PDFDocument.create();
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 842;
    const text = "Rex Happy Path";
    const size = TNRK_CRITIQUE_NARRATIVE_SIZE;
    const x = centeredTextX(text, size, bold, pageWidth);
    const width = bold.widthOfTextAtSize(text, size);
    expect(x + width / 2).toBeCloseTo(pageWidth / 2, 5);
  });

  it("builds a PDF with the header name and transcript body", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Rex Happy Path",
      dob: "2024-01-01",
      armband: "101",
      narrative: "Strong male. Moves freely. Excellent proportions.",
      class_and_rating: "Intermediate Class — V",
      date: "2026-08-13",
      owner: "Max Mustermann",
      co_owner: "",
      judge_signature: "Test Judge",
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("keeps the rating on the class line only", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Der Norden's Aka Azure",
      dob: "2026-04-02",
      armband: "8",
      narrative: "Very promising female.",
      class_and_rating: "Puppy Class I — Females — VP 4",
      rating: "VP Very promising",
      date: "2026-09-05",
      owner: "Christiane Poiré",
      co_owner: "",
      judge_signature: "Hamid Falah",
    });
    const text = extractPdfText(bytes);
    expect(pdfContainsText(bytes, "Der Norden's Aka Azure")).toBe(true);
    expect(pdfContainsText(bytes, "Puppy Class I Females")).toBe(true);
    expect(text).toMatch(/VP 4/);
    expect(text.toLowerCase()).not.toContain("vp very promising");
  });
});
