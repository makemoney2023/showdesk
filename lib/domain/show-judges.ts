import type { DogSex } from "./class-division";
import { showWeekendDays, weekendDayKind } from "./show-weekend";

const HAMID = /\b(hamid|hamill|falah)\b/i;
const RECK = /\breck\b/i;

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

export function isSundayConformationDay(input: {
  competitionDay?: string | null;
  showDate?: string | null;
}): boolean {
  const day = (input.competitionDay ?? "").trim();
  if (!day) return false;
  const weekend = showWeekendDays((input.showDate ?? day).trim());
  return weekendDayKind(weekend, day) === "sunday";
}

/**
 * Conformation only. Saturday: Reck females, Hamid males.
 * Sunday: Reck males, Hamid / Hamill females. SE forms keep their own judge.
 */
export function judgeForDogSex(
  sex: DogSex | null | undefined,
  judges: Iterable<string>,
  input?: { sunday?: boolean },
): string | null {
  const names = normalizeJudgeNames(judges);
  const sunday = Boolean(input?.sunday);
  const malePattern = sunday ? RECK : HAMID;
  const femalePattern = sunday ? HAMID : RECK;
  if (sex === "R") {
    return names.find((name) => malePattern.test(name)) ?? null;
  }
  if (sex === "H") {
    return names.find((name) => femalePattern.test(name)) ?? null;
  }
  return null;
}

/** Stamp a conformation critique judge from dog sex. Do not use for SE forms. */
export function resolveAssignedJudge(input: {
  sex?: DogSex | null;
  judges: Iterable<string>;
  requested?: string | null;
  fallback?: string | null;
  sunday?: boolean;
  competitionDay?: string | null;
  showDate?: string | null;
}): string {
  const sunday =
    input.sunday ??
    isSundayConformationDay({
      competitionDay: input.competitionDay,
      showDate: input.showDate,
    });
  return (
    judgeForDogSex(input.sex, input.judges, { sunday }) ||
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
