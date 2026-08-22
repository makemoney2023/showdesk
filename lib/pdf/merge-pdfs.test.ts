import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mergePdfDocuments } from "./merge-pdfs";

async function onePagePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  return pdf.save();
}

describe("mergePdfDocuments", () => {
  it("concatenates pages from each part", async () => {
    const merged = await mergePdfDocuments([
      await onePagePdf(),
      await onePagePdf(),
    ]);
    const pdf = await PDFDocument.load(merged);
    expect(pdf.getPageCount()).toBe(2);
  });
});
