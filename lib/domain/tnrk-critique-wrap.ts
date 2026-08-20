export const TNRK_CRITIQUE_MAX_NARRATIVE_LINES = 12;
export const TNRK_CRITIQUE_NARRATIVE_WRAP = 90;

export function wrapCritiqueNarrative(
  text: string,
  max = TNRK_CRITIQUE_NARRATIVE_WRAP,
): string[] {
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

export function critiqueNarrativeOverflowsCertificate(narrative: string): boolean {
  return wrapCritiqueNarrative(narrative).length > TNRK_CRITIQUE_MAX_NARRATIVE_LINES;
}
