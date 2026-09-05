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
 * Narrative band sits between header row (~210) and CLASS (~440).
 * Body title + critique are shifted +20% from the original band tops
 * (235 / 258) so they clear printed certificate text.
 */
const TNRK_CRITIQUE_BODY_TOP_SHIFT = 1.2;

export const TNRK_CRITIQUE_FIELD_TOP = {
  dog_name: 214,
  /** Bold dog title inside the critique body band (+20% lower) */
  body_title: Math.round(235 * TNRK_CRITIQUE_BODY_TOP_SHIFT),
  /** Critique lines start (+20% lower) */
  narrative_start: Math.round(258 * TNRK_CRITIQUE_BODY_TOP_SHIFT),
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

/** Base body title size (minimum 24pt for certificate prominence). */
export const TNRK_CRITIQUE_BODY_TITLE_BASE_SIZE = 24;
/** Dog name title in the critique band — 20% larger than base (≥28.8pt). */
export const TNRK_CRITIQUE_BODY_TITLE_SIZE =
  TNRK_CRITIQUE_BODY_TITLE_BASE_SIZE * 1.2;
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
  ) => {
    if (!text?.trim()) return;
    page.drawText(text.slice(0, 140), {
      x,
      y,
      size,
      font: useBold ? bold : font,
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
  draw(form.dob, TNRK_CRITIQUE_FIELD_X.dob, yHeader, 10);
  draw(form.armband, TNRK_CRITIQUE_FIELD_X.armband, yHeader, 10);

  // Body: centered bold dog title (+20%), centered critique underneath
  drawCentered(
    form.dog_name,
    baseline(TNRK_CRITIQUE_FIELD_TOP.body_title),
    TNRK_CRITIQUE_BODY_TITLE_SIZE,
    true,
  );

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

