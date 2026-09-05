import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { pdfContainsText } from "./pdf-text";
import {
  TNRK_CRITIQUE_BODY_TITLE_BASE_SIZE,
  TNRK_CRITIQUE_BODY_TITLE_SIZE,
  TNRK_CRITIQUE_FIELD_TOP,
  TNRK_CRITIQUE_FIELD_X,
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
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeGreaterThan(
      TNRK_CRITIQUE_FIELD_TOP.dog_name,
    );
    expect(TNRK_CRITIQUE_FIELD_TOP.class_and_rating).toBeGreaterThan(440);
    expect(TNRK_CRITIQUE_FIELD_X.dog_name).toBeGreaterThan(184);
    expect(TNRK_CRITIQUE_FIELD_X.dob).toBeGreaterThan(648);
  });

  it("shifts body dog title and critique 20% lower to clear certificate print", () => {
    // Previous band tops were 235 / 258; +20% keeps them below header print.
    expect(TNRK_CRITIQUE_FIELD_TOP.body_title).toBe(Math.round(235 * 1.2));
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBe(Math.round(258 * 1.2));
    expect(TNRK_CRITIQUE_FIELD_TOP.body_title).toBeLessThan(
      TNRK_CRITIQUE_FIELD_TOP.narrative_start,
    );
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeLessThan(
      TNRK_CRITIQUE_FIELD_TOP.class_and_rating,
    );
  });

  it("makes the body dog title at least 24pt and 20% larger than base", () => {
    expect(TNRK_CRITIQUE_BODY_TITLE_BASE_SIZE).toBeGreaterThanOrEqual(24);
    expect(TNRK_CRITIQUE_BODY_TITLE_SIZE).toBe(
      TNRK_CRITIQUE_BODY_TITLE_BASE_SIZE * 1.2,
    );
    expect(TNRK_CRITIQUE_BODY_TITLE_SIZE).toBeGreaterThanOrEqual(24);
  });

  it("centers text on the page width", async () => {
    const pdf = await PDFDocument.create();
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 842;
    const text = "Rex Happy Path";
    const size = TNRK_CRITIQUE_BODY_TITLE_SIZE;
    const x = centeredTextX(text, size, bold, pageWidth);
    const width = bold.widthOfTextAtSize(text, size);
    expect(x + width / 2).toBeCloseTo(pageWidth / 2, 5);
  });

  it("builds a PDF with bold dog title and transcript body", async () => {
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

  it("draws the rating beside the dog name", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Der Norden's Aka Azure",
      dob: "2026-04-02",
      armband: "8",
      narrative: "Very promising female.",
      class_and_rating: "Puppy Class I Females — vv",
      rating: "vv Very promising",
      date: "2026-09-05",
      owner: "Christiane Poiré",
      co_owner: "",
      judge_signature: "Hamid Falah",
    });
    expect(pdfContainsText(bytes, "Der Norden's Aka Azure")).toBe(true);
    expect(pdfContainsText(bytes, "vv Very promising")).toBe(true);
  });
});
