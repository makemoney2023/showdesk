import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { TnrkCritiqueForm } from "@/lib/domain/tnrk-se-form";
import {
  critiqueLetterForCertificate,
  SE_SYNC_NOTE,
} from "@/lib/domain/se-to-critique";
import {
  TNRK_CRITIQUE_MAX_NARRATIVE_LINES,
  wrapCritiqueNarrative,
} from "@/lib/domain/tnrk-critique-wrap";

export {
  TNRK_CRITIQUE_MAX_NARRATIVE_LINES,
  TNRK_CRITIQUE_NARRATIVE_WRAP,
  critiqueNarrativeOverflowsCertificate,
  wrapCritiqueNarrative,
} from "@/lib/domain/tnrk-critique-wrap";

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
 * Narrative band sits between header row (~206) and CLASS (~440).
 * Critique lines are shifted +20% from the original band top (258)
 * so they clear printed certificate text.
 */
const TNRK_CRITIQUE_BODY_TOP_SHIFT = 1.2;

export const TNRK_CRITIQUE_FIELD_TOP = {
  /** Header NAME DES HUNDES fill-in, a few points above the old 214pt row. */
  dog_name: 206,
  /** Critique lines start (+20% lower) */
  narrative_start: Math.round(258 * TNRK_CRITIQUE_BODY_TOP_SHIFT),
  class_and_rating: 472,
  date: 468,
  owner: 500,
  co_owner: 525,
  judge_signature: 556,
} as const;

/**
 * Printed label boxes on page-01.pdf (pdftotext -bbox, origin = page top-left).
 * Overlay values sit immediately after their label — never on the next one.
 */
export const TNRK_TEMPLATE_LABELS = {
  gebDatum: { x0: 585.59, x1: 648.58 },
  armbandNr: { x0: 699.35, x1: 770.39 },
} as const;

export const TNRK_CRITIQUE_FIELD_X = {
  dog_name: 195,
  /** Just after GEB.-DATUM; must stay left of ARMBAND-NR. */
  dob: 652,
  /** Just after ARMBAND-NR. */
  armband: 778,
  narrative: 55,
  class_and_rating: 290,
  date: 655,
  owner: 185,
  co_owner: 255,
  judge_signature: 385,
} as const;

export const TNRK_CRITIQUE_NARRATIVE_SIZE = 10;

/** Prefer secretary-edited STT draft → spoken transcript. Never SE form text. */
export function resolveCritiqueCertificateNarrative(input: {
  draftNarrative?: string | null;
  transcript?: string | null;
  seReplacementDraft?: boolean;
}): string {
  return critiqueLetterForCertificate({
    transcript: input.transcript ?? "",
    draft: {
      narrative: input.draftNarrative ?? "",
      formwert: null,
      placement: null,
      titles: [],
      draftAssist: input.seReplacementDraft ? { note: SE_SYNC_NOTE } : {},
    },
  });
}

/** Horizontal x so `text` is centered on the page. */
export function centeredTextX(
  text: string,
  size: number,
  font: PDFFont,
  pageWidth: number,
  margin = 40,
): number {
  const width = font.widthOfTextAtSize(text, size);
  return Math.max(margin, (pageWidth - width) / 2);
}

/** Overlay critique fields onto TNRK landscape Critique / Richterbericht blank. */
export async function buildTnrkCritiquePdf(
  form: TnrkCritiqueForm,
): Promise<Uint8Array> {
  const bytes = await fs.readFile(TEMPLATE);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const mediaY = page.getMediaBox().y;
  const yFromTop = (fromTop: number) => height - fromTop + mediaY;
  const baseline = (bottomFromTop: number, inset = 10) =>
    yFromTop(bottomFromTop - inset);

  const draw = (
    text: string,
    x: number,
    y: number,
    size = 10,
    useBold = false,
    maxX?: number,
  ) => {
    if (!text?.trim()) return;
    const face = useBold ? bold : font;
    let out = text.slice(0, 140);
    let used = size;
    if (maxX != null) {
      const maxW = Math.max(0, maxX - x);
      while (used > 7 && face.widthOfTextAtSize(out, used) > maxW) {
        used -= 0.5;
      }
      while (out.length > 0 && face.widthOfTextAtSize(out, used) > maxW) {
        out = out.slice(0, -1);
      }
    }
    if (!out) return;
    page.drawText(out, {
      x,
      y,
      size: used,
      font: face,
      color: rgb(0.05, 0.05, 0.05),
    });
  };

  const drawCentered = (
    text: string,
    y: number,
    size: number,
    useBold = false,
  ) => {
    if (!text?.trim()) return;
    const clipped = text.slice(0, 140);
    const face = useBold ? bold : font;
    draw(clipped, centeredTextX(clipped, size, face, width), y, size, useBold);
  };

  // Header form fields (template NAME DES HUNDES / DOB / armband row)
  const yHeader = baseline(TNRK_CRITIQUE_FIELD_TOP.dog_name);
  draw(form.dog_name, TNRK_CRITIQUE_FIELD_X.dog_name, yHeader, 12, true);
  draw(
    form.dob,
    TNRK_CRITIQUE_FIELD_X.dob,
    yHeader,
    10,
    false,
    TNRK_TEMPLATE_LABELS.armbandNr.x0 - 3,
  );
  draw(form.armband, TNRK_CRITIQUE_FIELD_X.armband, yHeader, 10);

  const lines = wrapCritiqueNarrative(form.narrative);
  lines.slice(0, TNRK_CRITIQUE_MAX_NARRATIVE_LINES).forEach((line, i) => {
    drawCentered(
      line,
      baseline(TNRK_CRITIQUE_FIELD_TOP.narrative_start + i * 14),
      TNRK_CRITIQUE_NARRATIVE_SIZE,
      false,
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

