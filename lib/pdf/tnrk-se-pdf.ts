import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";

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
 *  357.5 / 381.5 / 405.5 measurements · 432 bite · ratings/gunfire/final below
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

export async function buildTnrkSePdf(form: TnrkSeForm): Promise<Uint8Array> {
  const bytes = await fs.readFile(TEMPLATE);
  const pdf = await PDFDocument.load(bytes);
  const page = pdf.getPages()[0];
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  const mediaY = page.getMediaBox().y;
  const yFromTop = (fromTop: number) => height - fromTop + mediaY;
  const baseline = (bottomFromTop: number, inset = 11) =>
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
  const y1 = baseline(168.5);
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

  // Measurements
  const m = form.measurements;
  const yM1 = baseline(357.5);
  draw(m.height, 110, yM1, 8, 210);
  draw(m.chest_depth, 295, yM1, 8, 386);
  draw(m.weight, 470, yM1, 8, 568);

  const yM2 = baseline(381.5);
  draw(m.body_length, 110, yM2, 8, 210);
  draw(m.chest_circumference, 295, yM2, 8, 386);
  draw(m.eye_color, 470, yM2, 8, 568);

  const yM3 = baseline(405.5);
  draw(m.muzzle_length, 110, yM3, 8, 210);
  draw(m.skull, 295, yM3, 8, 386);
  draw(m.legible_tattoo, 470, yM3, 8, 568);

  // Bite
  mark(form.bite === "correct_scissor", 158, yFromTop(421));
  mark(form.bite === "other", 370, yFromTop(421));
  draw(form.bite_other, 455, yFromTop(422), 8, 569);

  // Appearance
  const appearanceLines = wrap(form.overall_appearance, 90);
  appearanceLines.slice(0, 6).forEach((line, i) => {
    draw(line, 48, yFromTop(462 + i * 11), 8);
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

  draw(form.comments, 200, yFromTop(678), 8, 569);

  mark(form.final_result === "pass", 200, yFromTop(699));
  mark(form.final_result === "fail", 246, yFromTop(699));

  draw(form.judge_signature || form.judge, 48, yFromTop(722), 9, 400);
  draw(form.event_secretary, 48, yFromTop(752), 9, 400);
  draw(form.signature_date || form.date, 520, yFromTop(765), 9, 569);

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
