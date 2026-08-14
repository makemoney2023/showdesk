import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TnrkCritiqueForm } from "@/lib/domain/tnrk-se-form";

const TEMPLATE = path.join(
  process.cwd(),
  "public/templates/tnrk/page-01.pdf",
);

/**
 * Coordinates from page-01.pdf via pdftotext -bbox (origin = page top-left).
 * Landscape 842.25 × 595.5; MediaBox.y ≈ 8.58 — must offset like SE PDF.
 *
 * Labels (fromTop):
 *  DOG/DOB/ARMBAND ~188–201 · CLASS/DATE ~447–461 · OWNER ~481 ·
 *  CO-OWNER ~507 · JUDGE SIGNATURE ~537–548
 * Narrative band sits between header row (~210) and CLASS (~440).
 */
export const TNRK_CRITIQUE_FIELD_TOP = {
  dog_name: 214,
  narrative_start: 235,
  class_and_rating: 472,
  date: 468,
  owner: 500,
  co_owner: 525,
  judge_signature: 556,
} as const;

export const TNRK_CRITIQUE_FIELD_X = {
  dog_name: 195,
  dob: 655,
  armband: 710,
  narrative: 55,
  class_and_rating: 290,
  date: 655,
  owner: 185,
  co_owner: 255,
  judge_signature: 385,
} as const;

/** Overlay critique fields onto TNRK landscape Critique / Richterbericht blank. */
export async function buildTnrkCritiquePdf(
  form: TnrkCritiqueForm,
): Promise<Uint8Array> {
  const bytes = await fs.readFile(TEMPLATE);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  const mediaY = page.getMediaBox().y;
  const yFromTop = (fromTop: number) => height - fromTop + mediaY;
  const baseline = (bottomFromTop: number, inset = 10) =>
    yFromTop(bottomFromTop - inset);

  const draw = (text: string, x: number, y: number, size = 10) => {
    if (!text?.trim()) return;
    page.drawText(text.slice(0, 140), {
      x,
      y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  };

  const yHeader = baseline(TNRK_CRITIQUE_FIELD_TOP.dog_name);
  draw(form.dog_name, TNRK_CRITIQUE_FIELD_X.dog_name, yHeader, 11);
  draw(form.dob, TNRK_CRITIQUE_FIELD_X.dob, yHeader, 10);
  draw(form.armband, TNRK_CRITIQUE_FIELD_X.armband, yHeader, 10);

  const lines = wrap(form.narrative, 105);
  lines.slice(0, 14).forEach((line, i) => {
    draw(
      line,
      TNRK_CRITIQUE_FIELD_X.narrative,
      baseline(TNRK_CRITIQUE_FIELD_TOP.narrative_start + i * 14),
      10,
    );
  });

  draw(
    form.class_and_rating,
    TNRK_CRITIQUE_FIELD_X.class_and_rating,
    baseline(TNRK_CRITIQUE_FIELD_TOP.class_and_rating),
    10,
  );
  draw(
    form.date,
    TNRK_CRITIQUE_FIELD_X.date,
    baseline(TNRK_CRITIQUE_FIELD_TOP.date),
    10,
  );
  draw(
    form.owner,
    TNRK_CRITIQUE_FIELD_X.owner,
    baseline(TNRK_CRITIQUE_FIELD_TOP.owner),
    10,
  );
  draw(
    form.co_owner,
    TNRK_CRITIQUE_FIELD_X.co_owner,
    baseline(TNRK_CRITIQUE_FIELD_TOP.co_owner),
    10,
  );
  draw(
    form.judge_signature,
    TNRK_CRITIQUE_FIELD_X.judge_signature,
    baseline(TNRK_CRITIQUE_FIELD_TOP.judge_signature),
    10,
  );

  return pdf.save();
}

function wrap(text: string, max: number): string[] {
  if (!text.trim()) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
