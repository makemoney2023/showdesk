import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import {
  normalizeTnrkSeForm,
  type TnrkSeForm,
  type TnrkSeMeasurements,
} from "@/lib/domain/tnrk-se-form";

const TEMPLATE = path.join(
  process.cwd(),
  "public/templates/tnrk/page-02.pdf",
);

/**
 * Coordinates from page-02.pdf via pdftotext -bbox (origin = page top-left).
 * pdf-lib uses bottom-left; this page's MediaBox.y is ~7.92 (not 0), so we
 * must add that offset or every overlay lands ~8pt too low.
 *
 * Identity table column borders (from rendered page-02):
 *  38.7 | 103.0 | 210.1 | 260.1 | 381.6 | 442.3 | 573.3
 * Pedigree: 38.7 | 135.0 | 316.8 | 395.1 | 573.3
 *
 * Row map (fromTop bottoms):
 *  144.5 DATE/CLUB/JUDGE · 168.5 DOG/SEX/REG · 192.5 DOB/CHIP/TATTOO
 *  216.5 SIRE · 235.5 DAM · 254 BREEDER · 278 OWNER · 297 ADDRESS · 315.5 HANDLER
 *  Measurements value cells (label | value per column):
 *   38.7 | 102.3 | 215.0 | 287.0 | 390.9 | 462.3 | 572.4
 *   row bottoms 357.4 / 381.1 / 405.8
 *  Appearance box 449.5–539.0 · comments value cell x≥185.7
 */
export const TNRK_SE_HEADER_VALUE = {
  left: { x: 110, maxX: 206 },
  mid: { x: 270, maxX: 377 },
  right: { x: 450, maxX: 569 },
} as const;

/** Printed ☐ boxes on the SEX / GESCHLECHT value cell (pdftotext -bbox). */
export const TNRK_SE_SEX_MARK = {
  male: { x: 284.0, fromTop: 159.0 },
  female: { x: 316.6, fromTop: 159.0 },
  size: 5,
} as const;

export const TNRK_SE_PEDIGREE_VALUE = {
  left: { x: 145, maxX: 312 },
  right: { x: 405, maxX: 569 },
  address: { x: 145, maxX: 569 },
} as const;

/**
 * Default cell inset is 11pt. The DOG / SEX / REG row is taller (two-line
 * labels), so values sat high. A smaller inset drops the baseline ~4pt.
 */
export const TNRK_SE_DEFAULT_INSET = 11;
export const TNRK_SE_ROW2_INSET = 7;

/**
 * Measurement grid from page-02 rule lines. Each cell is label | value;
 * values are left-aligned in the right-hand box and vertically centered.
 */
export const TNRK_SE_MEASUREMENT_VALUE = {
  col1: { x: 108, maxX: 210 },
  col2: { x: 292, maxX: 386 },
  col3: { x: 468, maxX: 568 },
  /** Baselines (fromTop) for the three measurement rows. */
  rowsFromTop: [349.0, 372.5, 396.5],
} as const;

/** Overall appearance / critique box on page-02. */
export const TNRK_SE_APPEARANCE = {
  x: 48,
  maxX: 568,
  firstFromTop: 458,
  lineHeight: 10,
  maxLines: 8,
} as const;

/** Comments / Bemerkungen value cell (right of the label). */
export const TNRK_SE_COMMENTS = {
  x: 192,
  maxX: 568,
  fromTop: 681,
} as const;

/** Shrink, then ellipsize, so overlay text stays inside a template cell. */
export function fitOverlayText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  minSize = 6,
): { text: string; size: number } {
  const trimmed = text.trim();
  if (!trimmed || maxWidth <= 0) return { text: "", size };
  let used = size;
  while (used > minSize && font.widthOfTextAtSize(trimmed, used) > maxWidth) {
    used -= 0.5;
  }
  if (font.widthOfTextAtSize(trimmed, used) <= maxWidth) {
    return { text: trimmed, size: used };
  }
  const ellipsis = "...";
  let clipped = trimmed;
  while (
    clipped.length > 1 &&
    font.widthOfTextAtSize(`${clipped}${ellipsis}`, used) > maxWidth
  ) {
    clipped = clipped.slice(0, -1).trimEnd();
  }
  if (font.widthOfTextAtSize(`${clipped}${ellipsis}`, used) > maxWidth) {
    return { text: "", size: used };
  }
  return { text: `${clipped}${ellipsis}`, size: used };
}

/** Word-wrap overlay text to a cell width using the same font metrics as draw(). */
export function wrapOverlayText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  if (!text.trim() || maxWidth <= 0) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      cur = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (chunk && font.widthOfTextAtSize(trial, size) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = trial;
      }
    }
    cur = chunk;
  }
  if (cur) lines.push(cur);
  return lines;
}

function seMeasurements(form: TnrkSeForm): TnrkSeMeasurements {
  return normalizeTnrkSeForm(form).measurements;
}

export async function buildTnrkSePdf(form: TnrkSeForm): Promise<Uint8Array> {
  form = normalizeTnrkSeForm(form);
  const bytes = await fs.readFile(TEMPLATE);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  const mediaY = page.getMediaBox().y;
  const yFromTop = (fromTop: number) => height - fromTop + mediaY;
  const baseline = (bottomFromTop: number, inset = TNRK_SE_DEFAULT_INSET) =>
    yFromTop(bottomFromTop - inset);

  const draw = (
    text: string,
    x: number,
    y: number,
    size = 8,
    maxX?: number,
  ) => {
    if (!text?.trim()) return;
    let out = text.trim();
    let used = size;
    if (maxX != null) {
      const fitted = fitOverlayText(out, font, size, maxX - x);
      out = fitted.text;
      used = fitted.size;
    } else {
      out = out.slice(0, 120);
    }
    if (!out) return;
    page.drawText(out, {
      x,
      y,
      size: used,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  };

  const mark = (checked: boolean, x: number, y: number, size = 9) => {
    if (!checked) return;
    page.drawText("X", {
      x,
      y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  const left = TNRK_SE_HEADER_VALUE.left;
  const mid = TNRK_SE_HEADER_VALUE.mid;
  const right = TNRK_SE_HEADER_VALUE.right;
  const pedL = TNRK_SE_PEDIGREE_VALUE.left;
  const pedR = TNRK_SE_PEDIGREE_VALUE.right;

  // Row 0 — DATE | CLUB | JUDGE
  const y0 = baseline(144.5);
  draw(form.date, left.x, y0, 8, left.maxX);
  // Template already prints the club name — only overlay if customized.
  if (form.club.trim() && form.club !== "True North Rottweiler Klub") {
    draw(form.club, 268, y0, 7, mid.maxX);
  }
  draw(form.judge, right.x, y0, 8, right.maxX);

  // Row 1 — DOG | SEX | REG  (dog name must not run into SEX / GESCHLECHT)
  const y1 = baseline(168.5, TNRK_SE_ROW2_INSET);
  draw(form.dog_name, left.x, y1, 9, left.maxX);
  mark(
    form.sex === "male",
    TNRK_SE_SEX_MARK.male.x,
    yFromTop(TNRK_SE_SEX_MARK.male.fromTop),
    TNRK_SE_SEX_MARK.size,
  );
  mark(
    form.sex === "female",
    TNRK_SE_SEX_MARK.female.x,
    yFromTop(TNRK_SE_SEX_MARK.female.fromTop),
    TNRK_SE_SEX_MARK.size,
  );
  draw(form.registration_number, right.x, y1, 8, right.maxX);

  // Row 2 — DOB | MICROCHIP | TATTOO
  const y2 = baseline(192.5);
  draw(form.date_of_birth, left.x, y2, 8, left.maxX);
  draw(form.microchip_nr, mid.x, y2, 8, mid.maxX);
  draw(form.tattoo_nr, right.x, y2, 8, right.maxX);

  // Pedigree
  const ySire = baseline(216.5);
  draw(form.sire, pedL.x, ySire, 8, pedL.maxX);
  draw(form.sire_reg, pedR.x, ySire, 8, pedR.maxX);

  const yDam = baseline(235.5);
  draw(form.dam, pedL.x, yDam, 8, pedL.maxX);
  draw(form.dam_reg, pedR.x, yDam, 8, pedR.maxX);

  const yBr = baseline(254.0);
  draw(form.breeder, pedL.x, yBr, 8, pedL.maxX);
  draw(form.hd_ed_jlpp_nr, pedR.x, yBr, 8, pedR.maxX);

  const yOwn = baseline(278.0);
  draw(form.owner_co_owner, pedL.x, yOwn, 8, pedL.maxX);
  draw(form.email, pedR.x, yOwn, 7, pedR.maxX);

  const yAddr = baseline(297.0);
  draw(
    form.address,
    TNRK_SE_PEDIGREE_VALUE.address.x,
    yAddr,
    8,
    TNRK_SE_PEDIGREE_VALUE.address.maxX,
  );

  const yHand = baseline(315.5);
  draw(form.handler, pedL.x, yHand, 8, pedL.maxX);
  draw(form.phone, pedR.x, yHand, 8, pedR.maxX);

  // Measurements — values sit in the right-hand box of each 3×3 cell
  const m = seMeasurements(form);
  const meas = TNRK_SE_MEASUREMENT_VALUE;
  const [yM1, yM2, yM3] = meas.rowsFromTop.map((fromTop) => yFromTop(fromTop));
  draw(m.height, meas.col1.x, yM1, 8, meas.col1.maxX);
  draw(m.chest_depth, meas.col2.x, yM1, 8, meas.col2.maxX);
  draw(m.weight, meas.col3.x, yM1, 8, meas.col3.maxX);
  draw(m.body_length, meas.col1.x, yM2, 8, meas.col1.maxX);
  draw(m.chest_circumference, meas.col2.x, yM2, 8, meas.col2.maxX);
  draw(m.eye_color, meas.col3.x, yM2, 8, meas.col3.maxX);
  draw(m.muzzle_length, meas.col1.x, yM3, 8, meas.col1.maxX);
  draw(m.skull, meas.col2.x, yM3, 8, meas.col2.maxX);
  draw(m.legible_tattoo, meas.col3.x, yM3, 8, meas.col3.maxX);

  // Bite
  mark(form.bite === "correct_scissor", 158, yFromTop(421));
  mark(form.bite === "other", 370, yFromTop(421));
  draw(form.bite_other, 455, yFromTop(422), 8, 569);

  // Critique — overall appearance box
  const appearance = TNRK_SE_APPEARANCE;
  const appearanceLines = wrapOverlayText(
    form.overall_appearance ?? "",
    font,
    8,
    appearance.maxX - appearance.x,
  );
  appearanceLines.slice(0, appearance.maxLines).forEach((line, i) => {
    draw(
      line,
      appearance.x,
      yFromTop(appearance.firstFromTop + i * appearance.lineHeight),
      8,
      appearance.maxX,
    );
  });

  // Ratings — optionText.xMin − ~3 (pdftotext -bbox)
  const headKeys = [
    "too_small",
    "slight_narrow",
    "sufficient_strong",
    "strong_typey",
    "too_large",
  ] as const;
  const headXs = [133, 212, 313, 429, 512];
  headKeys.forEach((k, i) =>
    mark(form.head_shape === k, headXs[i], yFromTop(560)),
  );

  const cheekKeys = [
    "lacking",
    "slight",
    "medium",
    "distinct",
    "too_strong",
  ] as const;
  const cheekXs = [133, 229, 337, 433, 509];
  cheekKeys.forEach((k, i) =>
    mark(form.cheek_bone === k, cheekXs[i], yFromTop(583)),
  );

  const boneKeys = [
    "fine",
    "sufficient",
    "medium",
    "strong",
    "coarse",
  ] as const;
  const boneXs = [140, 218, 337, 436, 516];
  boneKeys.forEach((k, i) =>
    mark(form.bone_strength === k, boneXs[i], yFromTop(605)),
  );

  const behKeys = [
    "fearful_shy",
    "reserved",
    "calm_neutral",
    "self_confident",
    "uncontrollable",
  ] as const;
  const behXs = [125, 221, 322, 422, 513];
  behKeys.forEach((k, i) =>
    mark(form.general_behavior === k, behXs[i], yFromTop(629)),
  );

  mark(form.gunfire === "no_reaction", 220, yFromTop(657));
  mark(form.gunfire === "sensitive", 352, yFromTop(657));
  mark(form.gunfire === "shy", 492, yFromTop(657));

  draw(
    form.comments,
    TNRK_SE_COMMENTS.x,
    yFromTop(TNRK_SE_COMMENTS.fromTop),
    8,
    TNRK_SE_COMMENTS.maxX,
  );

  mark(form.final_result === "pass", 200, yFromTop(699));
  mark(form.final_result === "fail", 246, yFromTop(699));

  draw(form.judge_signature || form.judge, 48, yFromTop(722), 9, 400);
  draw(form.event_secretary, 48, yFromTop(752), 9, 400);
  draw(form.signature_date || form.date, 520, yFromTop(765), 9, 569);

  return pdf.save();
}
