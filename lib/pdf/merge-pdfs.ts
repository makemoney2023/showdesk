import { PDFDocument } from "pdf-lib";

/** Concatenate PDF byte arrays into one document, preserving page order. */
export async function mergePdfDocuments(
  parts: Uint8Array[],
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const part of parts) {
    const src = await PDFDocument.load(part);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      out.addPage(page);
    }
  }
  return out.save();
}
