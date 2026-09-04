import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  createEmptyTnrkSeForm,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import { pdfContainsText } from "./pdf-text";
import {
  TNRK_SE_APPEARANCE,
  TNRK_SE_COMMENTS,
  TNRK_SE_DEFAULT_INSET,
  TNRK_SE_HEADER_VALUE,
  TNRK_SE_MEASUREMENT_VALUE,
  TNRK_SE_ROW2_INSET,
  TNRK_SE_SEX_MARK,
  buildTnrkSePdf,
  fitOverlayText,
  wrapOverlayText,
} from "./tnrk-se-pdf";

describe("TNRK SE identity row layout", () => {
  it("keeps the dog-name cell left of SEX / GESCHLECHT", () => {
    // SEX label cell starts at x=210.1 on page-02.
    expect(TNRK_SE_HEADER_VALUE.left.maxX).toBeLessThan(210);
    expect(TNRK_SE_HEADER_VALUE.left.x).toBeLessThan(
      TNRK_SE_HEADER_VALUE.left.maxX,
    );
    expect(TNRK_SE_HEADER_VALUE.right.x).toBeGreaterThan(440);
    expect(TNRK_SE_HEADER_VALUE.right.maxX).toBeLessThan(574);
  });

  it("drops dog name and registration to the vertical center of the row", () => {
    expect(TNRK_SE_ROW2_INSET).toBeLessThan(TNRK_SE_DEFAULT_INSET);
    expect(TNRK_SE_DEFAULT_INSET - TNRK_SE_ROW2_INSET).toBeGreaterThanOrEqual(3);
    expect(TNRK_SE_DEFAULT_INSET - TNRK_SE_ROW2_INSET).toBeLessThanOrEqual(5);
  });

  it("places sex marks on the printed MALE / FEMALE boxes", () => {
    // Male ☐ 284.5–286.9 · Female ☐ 317.1–319.5 · RÜDE ends ~315.9
    expect(TNRK_SE_SEX_MARK.male.x).toBeGreaterThan(282);
    expect(TNRK_SE_SEX_MARK.male.x).toBeLessThan(286);
    expect(TNRK_SE_SEX_MARK.female.x).toBeGreaterThan(315.9);
    expect(TNRK_SE_SEX_MARK.female.x).toBeLessThan(318);
    expect(TNRK_SE_SEX_MARK.female.x).toBeGreaterThan(TNRK_SE_SEX_MARK.male.x);
    expect(TNRK_SE_SEX_MARK.size).toBeLessThanOrEqual(6);
  });
});

describe("fitOverlayText", () => {
  it("shrinks a long kennel name to stay in the dog-name cell", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const name = "Beyonce Aus Dem Blumental";
    const maxWidth =
      TNRK_SE_HEADER_VALUE.left.maxX - TNRK_SE_HEADER_VALUE.left.x;
    const fitted = fitOverlayText(name, font, 9, maxWidth);
    expect(font.widthOfTextAtSize(fitted.text, fitted.size)).toBeLessThanOrEqual(
      maxWidth + 0.05,
    );
    expect(fitted.text.startsWith("Beyonce")).toBe(true);
    expect(fitted.size).toBeLessThanOrEqual(9);
  });

  it("ellipsizes when shrinking is not enough", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fitted = fitOverlayText(
      "Extremely Long Rottweiler Kennel Name Vom Test",
      font,
      9,
      40,
    );
    expect(fitted.text.endsWith("...")).toBe(true);
    expect(font.widthOfTextAtSize(fitted.text, fitted.size)).toBeLessThanOrEqual(
      40 + 0.05,
    );
  });
});

describe("TNRK SE measurement and critique layout", () => {
  it("places measurement values in the right-hand box of each cell", () => {
    const { col1, col2, col3, rowsFromTop } = TNRK_SE_MEASUREMENT_VALUE;
    // Label | value splits from page-02 rule lines
    expect(col1.x).toBeGreaterThan(102);
    expect(col1.maxX).toBeLessThan(215);
    expect(col2.x).toBeGreaterThan(287);
    expect(col2.maxX).toBeLessThan(391);
    expect(col3.x).toBeGreaterThan(462);
    expect(col3.maxX).toBeLessThan(573);
    // Vertically centered in rows 335.3–357.4 / 357.4–381.1 / 381.1–405.8
    expect(rowsFromTop[0]).toBeGreaterThan(344);
    expect(rowsFromTop[0]).toBeLessThan(355);
    expect(rowsFromTop[1]).toBeGreaterThan(368);
    expect(rowsFromTop[1]).toBeLessThan(378);
    expect(rowsFromTop[2]).toBeGreaterThan(392);
    expect(rowsFromTop[2]).toBeLessThan(402);
  });

  it("keeps the critique inside the appearance box and comments in the value cell", () => {
    const lastLine =
      TNRK_SE_APPEARANCE.firstFromTop +
      (TNRK_SE_APPEARANCE.maxLines - 1) * TNRK_SE_APPEARANCE.lineHeight;
    expect(TNRK_SE_APPEARANCE.x).toBeGreaterThan(38);
    expect(TNRK_SE_APPEARANCE.maxX).toBeLessThan(573);
    expect(TNRK_SE_APPEARANCE.firstFromTop).toBeGreaterThan(449);
    expect(lastLine).toBeLessThan(539);
    expect(TNRK_SE_COMMENTS.x).toBeGreaterThan(185);
    expect(TNRK_SE_COMMENTS.fromTop).toBeGreaterThan(667);
    expect(TNRK_SE_COMMENTS.fromTop).toBeLessThan(689);
  });
});

describe("wrapOverlayText", () => {
  it("wraps a long critique so each line fits the appearance box", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const critique = Array.from({ length: 40 }, (_, i) => `note${i}`).join(" ");
    const maxWidth = TNRK_SE_APPEARANCE.maxX - TNRK_SE_APPEARANCE.x;
    const lines = wrapOverlayText(critique, font, 8, maxWidth);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 8)).toBeLessThanOrEqual(
        maxWidth + 0.05,
      );
    }
  });
});

describe("buildTnrkSePdf", () => {
  it("builds a PDF with a long second-row dog name", async () => {
    const form = createEmptyTnrkSeForm();
    form.dog_name = "Beyonce Aus Dem Blumental";
    form.sex = "female";
    form.registration_number = "CKC-FD-LU4301060";
    const bytes = await buildTnrkSePdf(form);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("overlays measurements, critique, and comments from the SE form", async () => {
    const form = createEmptyTnrkSeForm();
    form.dog_name = "Rex vom Test";
    form.measurements = {
      height: "62 cm",
      chest_depth: "28 cm",
      weight: "42 kg",
      body_length: "70 cm",
      chest_circumference: "80 cm",
      eye_color: "dark brown",
      muzzle_length: "10 cm",
      skull: "15 cm",
      legible_tattoo: "yes",
    };
    form.overall_appearance =
      "Strong male of excellent type with a powerful head and confident ring behavior.";
    form.comments = "Very good temperament.";
    const bytes = await buildTnrkSePdf(form);
    expect(pdfContainsText(bytes, "62 cm")).toBe(true);
    expect(pdfContainsText(bytes, "28 cm")).toBe(true);
    expect(pdfContainsText(bytes, "42 kg")).toBe(true);
    expect(pdfContainsText(bytes, "70 cm")).toBe(true);
    expect(pdfContainsText(bytes, "80 cm")).toBe(true);
    expect(pdfContainsText(bytes, "dark brown")).toBe(true);
    expect(pdfContainsText(bytes, "10 cm")).toBe(true);
    expect(pdfContainsText(bytes, "15 cm")).toBe(true);
    expect(pdfContainsText(bytes, "yes")).toBe(true);
    expect(pdfContainsText(bytes, "powerful head")).toBe(true);
    expect(pdfContainsText(bytes, "confident ring behavior")).toBe(true);
    expect(pdfContainsText(bytes, "Very good temperament")).toBe(true);
  });

  it("does not throw when a stored form omitted measurements", async () => {
    const form = createEmptyTnrkSeForm();
    delete (form as { measurements?: TnrkSeForm["measurements"] }).measurements;
    const bytes = await buildTnrkSePdf(form);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });

  it("draws a partial measurements object", async () => {
    const form = {
      ...createEmptyTnrkSeForm(),
      measurements: { height: "61" } as TnrkSeForm["measurements"],
    };
    const bytes = await buildTnrkSePdf(form);
    expect(pdfContainsText(bytes, "61")).toBe(true);
  });
});
