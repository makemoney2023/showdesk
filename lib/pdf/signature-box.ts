import { rgb, type PDFPage } from "pdf-lib";

export const SIGNATURE_LINE_FROM_BOTTOM = 7;

/** Draw a printable signature pad (border + baseline) for wet-ink or e-sign. */
export function drawSignatureBox(
  page: PDFPage,
  box: { x: number; width: number; height: number; lineFromBottom?: number },
  yBottom: number,
): void {
  const border = rgb(0.12, 0.12, 0.12);
  page.drawRectangle({
    x: box.x,
    y: yBottom,
    width: box.width,
    height: box.height,
    borderColor: border,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  const inset = 8;
  const lineY = yBottom + (box.lineFromBottom ?? SIGNATURE_LINE_FROM_BOTTOM);
  page.drawLine({
    start: { x: box.x + inset, y: lineY },
    end: { x: box.x + box.width - inset, y: lineY },
    thickness: 0.6,
    color: rgb(0.45, 0.45, 0.45),
  });
}
