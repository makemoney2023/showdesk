import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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
 * Row map (fromTop bottoms):
 *  144.5 DATE/CLUB/JUDGE · 168.5 DOG/SEX/REG · 192.5 DOB/CHIP/TATTOO
 *  216.5 SIRE · 235.5 DAM · 254 BREEDER · 278 OWNER · 297 ADDRESS · 315.5 HANDLER
 *  357.5 / 381.5 / 405.5 measurements · 432 bite · ratings/gunfire/final below
 */
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

  const draw = (text: string, x: number, y: number, size = 8) => {
    if (!text?.trim()) return;
    page.drawText(text.slice(0, 120), {
      x,
      y,
      size,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
  };

  const mark = (checked: boolean, x: number, y: number) => {
    if (!checked) return;
    page.drawText("X", {
      x,
      y,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  // Row 0 — DATE | CLUB | JUDGE
  const y0 = baseline(144.5);
  draw(form.date, 110, y0, 8);
  // Template already prints the club name — only overlay if customized.
  if (form.club.trim() && form.club !== "True North Rottweiler Klub") {
    draw(form.club, 268, y0, 7);
  }
  draw(form.judge, 450, y0, 8);

  // Row 1 — DOG | SEX | REG
  const y1 = baseline(168.5);
  draw(form.dog_name, 110, y1, 9);
  mark(form.sex === "male", 276, yFromTop(157));
  mark(form.sex === "female", 309, yFromTop(157));
  draw(form.registration_number, 450, y1, 8);

  // Row 2 — DOB | MICROCHIP | TATTOO
  const y2 = baseline(192.5);
  draw(form.date_of_birth, 110, y2, 8);
  draw(form.microchip_nr, 270, y2, 8);
  draw(form.tattoo_nr, 450, y2, 8);

  // Pedigree
  const ySire = baseline(216.5);
  draw(form.sire, 145, ySire, 8);
  draw(form.sire_reg, 405, ySire, 8);

  const yDam = baseline(235.5);
  draw(form.dam, 145, yDam, 8);
  draw(form.dam_reg, 405, yDam, 8);

  const yBr = baseline(254.0);
  draw(form.breeder, 145, yBr, 8);
  draw(form.hd_ed_jlpp_nr, 405, yBr, 8);

  const yOwn = baseline(278.0);
  draw(form.owner_co_owner, 145, yOwn, 8);
  draw(form.email, 405, yOwn, 7);

  const yAddr = baseline(297.0);
  draw(form.address, 145, yAddr, 8);

  const yHand = baseline(315.5);
  draw(form.handler, 145, yHand, 8);
  draw(form.phone, 405, yHand, 8);

  // Measurements
  const m = form.measurements;
  const yM1 = baseline(357.5);
  draw(m.height, 110, yM1, 8);
  draw(m.chest_depth, 295, yM1, 8);
  draw(m.weight, 470, yM1, 8);

  const yM2 = baseline(381.5);
  draw(m.body_length, 110, yM2, 8);
  draw(m.chest_circumference, 295, yM2, 8);
  draw(m.eye_color, 470, yM2, 8);

  const yM3 = baseline(405.5);
  draw(m.muzzle_length, 110, yM3, 8);
  draw(m.skull, 295, yM3, 8);
  draw(m.legible_tattoo, 470, yM3, 8);

  // Bite
  mark(form.bite === "correct_scissor", 158, yFromTop(421));
  mark(form.bite === "other", 370, yFromTop(421));
  draw(form.bite_other, 455, yFromTop(422), 8);

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

  draw(form.comments, 200, yFromTop(678), 8);

  mark(form.final_result === "pass", 200, yFromTop(699));
  mark(form.final_result === "fail", 246, yFromTop(699));

  draw(form.judge_signature || form.judge, 48, yFromTop(722), 9);
  draw(form.event_secretary, 48, yFromTop(752), 9);
  draw(form.signature_date || form.date, 520, yFromTop(765), 9);

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
