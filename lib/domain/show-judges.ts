import type { DogSex } from "./class-division";

const MALE_JUDGE = /\b(hamid|hamill|falah)\b/i;
const FEMALE_JUDGE = /\breck\b/i;

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

/** Conformation only: Reck judges females; Hamid / Falah judges males. SE forms keep their own judge. */
export function judgeForDogSex(
  sex: DogSex | null | undefined,
  judges: Iterable<string>,
): string | null {
  const names = normalizeJudgeNames(judges);
  if (sex === "R") {
    return names.find((name) => MALE_JUDGE.test(name)) ?? null;
  }
  if (sex === "H") {
    return names.find((name) => FEMALE_JUDGE.test(name)) ?? null;
  }
  return null;
}

/** Stamp a conformation critique judge from dog sex. Do not use for SE forms. */
export function resolveAssignedJudge(input: {
  sex?: DogSex | null;
  judges: Iterable<string>;
  requested?: string | null;
  fallback?: string | null;
}): string {
  return (
    judgeForDogSex(input.sex, input.judges) ||
    (input.requested ?? "").trim() ||
    (input.fallback ?? "").trim()
  );
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
