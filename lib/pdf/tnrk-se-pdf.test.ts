import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import {
  TNRK_SE_DEFAULT_INSET,
  TNRK_SE_HEADER_VALUE,
  TNRK_SE_ROW2_INSET,
  TNRK_SE_SEX_MARK,
  buildTnrkSePdf,
  fitOverlayText,
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
});
