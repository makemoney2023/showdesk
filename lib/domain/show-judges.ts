export function normalizeJudgeNames(
  input: Iterable<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of input) {
    const name = (raw ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function syncShowJudges(input: {
  judge?: string;
  judges?: string[];
}): { judge: string; judges: string[] } {
  const fromList =
    input.judges != null ? normalizeJudgeNames(input.judges) : [];
  const judges =
    fromList.length > 0 ? fromList : normalizeJudgeNames([input.judge]);
  return { judges, judge: judges[0] ?? "" };
}

export function canRecordWithJudge(
  selected: string | null | undefined,
  judges: Iterable<string>,
): boolean {
  const name = (selected ?? "").trim();
  if (!name) return false;
  return normalizeJudgeNames(judges).includes(name);
}

export function resolvePdfJudge(input: {
  critiqueJudge?: string | null;
  seJudge?: string | null;
  showJudge?: string | null;
}): string {
  const critique = (input.critiqueJudge ?? "").trim();
  if (critique) return critique;
  const se = (input.seJudge ?? "").trim();
  if (se) return se;
  return (input.showJudge ?? "").trim();
}

export function formatShowJudges(judges: Iterable<string>): string {
  const names = normalizeJudgeNames(judges);
  return names.length > 0 ? names.join(" · ") : "Judge TBD";
}

export function judgeStorageKey(showId: string): string {
  return `sss-judge:${showId}`;
}
