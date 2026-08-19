import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import {
  ADRK_CLASSES,
  ADRK_FORMWERT_CODES,
  ADRK_TITLE_OPTIONS,
  getAdrkClassLabel,
} from "@/lib/domain/adrk-template";
import type { AdrkClassId } from "@/lib/domain/adrk-template";
import type { RosterEntryRecord, Show } from "@/lib/types";

export interface RichterberichtInput {
  show: Show;
  entry: RosterEntryRecord;
  draft: DraftCritiqueSchema;
}

export async function buildAdrkRichterberichtPdf(
  input: RichterberichtInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { show, entry, draft } = input;

  let y = 800;
  const draw = (text: string, size = 10, useBold = false) => {
    page.drawText(text, {
      x: 40,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 6;
  };

  draw("ADRK Richterbericht (draft — Stand 08/2023 template)", 12, true);
  draw(`Show: ${show.name} · ${show.date} · ${show.venue}`);
  draw(`Judge: ${show.judge}`);
  y -= 8;

  draw("Class (checkbox fields):", 10, true);
  for (const cls of ADRK_CLASSES) {
    const checked = entry.class_id === cls.id ? "[x]" : "[ ]";
    draw(`${checked} ${cls.label} (${cls.note})`);
  }
  y -= 4;

  draw(`Sex: ${entry.sex === "R" ? "[x] R" : "[ ] R"}  ${entry.sex === "H" ? "[x] H" : "[ ] H"}`);
  draw(`Kat.-Nr. / Armband: ${entry.armband}`);
  draw(entry.dog_name, 16, true);
  draw(`ZB-Nr.: ${entry.zb_number}`);
  draw(`WT: ${entry.wt}`);
  draw(`Eigentümer: ${entry.owner}`);
  y -= 8;

  draw("Formwertnoten:", 10, true);
  for (const code of ADRK_FORMWERT_CODES) {
    const checked = draft.formwert === code ? "[x]" : "[ ]";
    draw(`${checked} ${code}`, 9);
  }
  y -= 4;

  draw("Platzierung:", 10, true);
  for (const p of [1, 2, 3, 4] as const) {
    const checked = draft.placement === p ? "[x]" : "[ ]";
    draw(`${checked} ${p}`, 9);
  }
  y -= 4;

  draw("Anwartschaften / Titel:", 10, true);
  for (const title of ADRK_TITLE_OPTIONS.slice(0, 10)) {
    const checked = draft.titles.includes(title) ? "[x]" : "[ ]";
    draw(`${checked} ${title}`, 8);
  }
  y -= 8;

  draw("Narrative critique (draft — free-form):", 10, true);
  const narrativeLines = wrapText(
    draft.narrative || "(pending secretary edit)",
    80,
  );
  for (const line of narrativeLines.slice(0, 12)) {
    draw(line, 9);
  }
  y -= 8;

  draw(`Ort: ${show.venue}`);
  draw(`Datum: ${show.date}`);
  draw(`Richter: ${show.judge}`);
  draw(`Klasse: ${getAdrkClassLabel(entry.class_id as AdrkClassId)}`);

  page.drawText(
    "Die Formwertnoten, Platzierungen, Anwartschaften etc. sind vom Richter auszufüllen!",
    { x: 40, y: 40, size: 8, font, color: rgb(0.3, 0.3, 0.3) },
  );

  return pdf.save();
}

function wrapText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxLen) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}
