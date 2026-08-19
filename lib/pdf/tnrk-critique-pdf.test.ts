import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
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
        seNarrative: "SE text",
      }),
    ).toBe("Edited narrative");
  });

  it("falls back to transcript when draft narrative is empty", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "  ",
        transcript: "Live STT body",
        seNarrative: "SE text",
      }),
    ).toBe("Live STT body");
  });

  it("falls back to SE narrative last", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "",
        transcript: "",
        seNarrative: "From SE form",
      }),
    ).toBe("From SE form");
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
      class_and_rating: "Zwischenklasse — V",
      date: "2026-08-13",
      owner: "Max Mustermann",
      co_owner: "",
      judge_signature: "Test Judge",
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
