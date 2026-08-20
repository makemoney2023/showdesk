import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TEMPLATE = path.join(
  process.cwd(),
  "public/templates/tnrk/page-03.pdf",
);

export interface TnrkAwardFields {
  date: string;
  /** Award title + dog identity lines drawn in the center blank. */
  lines: string[];
  judge: string;
  show_secretary: string;
}

/** Same MediaBox offset as SE / critique overlays (origin is not always 0). */
export function awardYFromTop(
  pageHeight: number,
  fromTop: number,
  mediaY: number,
): number {
  return pageHeight - fromTop + mediaY;
}

/** Overlay award fields onto TNRK Award certificate blank (page 03). */
export async function buildTnrkAwardPdf(
  fields: TnrkAwardFields,
): Promise<Uint8Array> {
  const bytes = await fs.readFile(TEMPLATE);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const mediaY = page.getMediaBox().y;
  const y = (fromTop: number) => awardYFromTop(height, fromTop, mediaY);

  if (fields.date.trim()) {
    page.drawText(fields.date.slice(0, 40), {
      x: 200,
      y: y(430),
      size: 12,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  fields.lines
    .filter((l) => l.trim())
    .slice(0, 5)
    .forEach((line, i) => {
      const size = i === 0 ? 16 : 12;
      const text = line.slice(0, 60);
      const textWidth = (i === 0 ? bold : font).widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: Math.max(48, (width - textWidth) / 2),
        y: y(480 + i * 22),
        size,
        font: i === 0 ? bold : font,
        color: rgb(0.05, 0.05, 0.05),
      });
    });

  if (fields.judge.trim()) {
    page.drawText(fields.judge.slice(0, 50), {
      x: 80,
      y: y(700),
      size: 11,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  }
  if (fields.show_secretary.trim()) {
    page.drawText(fields.show_secretary.slice(0, 50), {
      x: 80,
      y: y(745),
      size: 11,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  }

  return pdf.save();
}
