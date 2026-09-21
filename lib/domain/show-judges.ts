import type { DogSex } from "./class-division";
import { showWeekendDays, weekendDayKind } from "./show-weekend";

const HAMID = /\b(hamid|hamill|falah)\b/i;
const RECK = /\breck\b/i;

export type JudgeAssignmentDay = "se" | "saturday" | "sunday";

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
  return assignmentDayForEntry(input) === "sunday";
}

/** Friday SE, Saturday, or Sunday from the catalog row + show date. */
export function assignmentDayForEntry(input: {
  eventKind?: string | null;
  competitionDay?: string | null;
  showDate?: string | null;
}): JudgeAssignmentDay | null {
  if ((input.eventKind ?? "").trim() === "se") return "se";
  const day = (input.competitionDay ?? "").trim();
  const showDate = (input.showDate ?? day).trim();
  if (!day || !showDate) return null;
  const weekend = showWeekendDays(showDate);
  const kind = weekendDayKind(weekend, day);
  if ((input.eventKind ?? "").trim() === "conformation" && kind === "se") {
    return "saturday";
  }
  return kind;
}

function findNamedJudge(
  names: string[],
  pattern: RegExp,
): string | null {
  return names.find((name) => pattern.test(name)) ?? null;
}

/**
 * Weekend ring assignment:
 * Friday SE — Sandra Reck (both sexes)
 * Saturday — females Sandra, males Hamid
 * Sunday — females Hamid, males Sandra
 */
export function judgeForAssignment(input: {
  sex?: DogSex | null;
  judges: Iterable<string>;
  day?: JudgeAssignmentDay | null;
}): string | null {
  const names = normalizeJudgeNames(input.judges);
  const day = input.day ?? null;
  if (day === "se") return findNamedJudge(names, RECK);
  if (day !== "saturday" && day !== "sunday") return null;
  const sunday = day === "sunday";
  const malePattern = sunday ? RECK : HAMID;
  const femalePattern = sunday ? HAMID : RECK;
  if (input.sex === "R") return findNamedJudge(names, malePattern);
  if (input.sex === "H") return findNamedJudge(names, femalePattern);
  return null;
}

/**
 * Conformation only unless `se` / `day: "se"` is set.
 * Saturday: Reck females, Hamid males.
 * Sunday: Reck males, Hamid / Hamill females.
 */
export function judgeForDogSex(
  sex: DogSex | null | undefined,
  judges: Iterable<string>,
  input?: { sunday?: boolean; se?: boolean; day?: JudgeAssignmentDay },
): string | null {
  const day =
    input?.day ??
    (input?.se ? "se" : input?.sunday ? "sunday" : "saturday");
  return judgeForAssignment({ sex, judges, day });
}

/** Stamp the judge from the weekend schedule. Friday SE is always Reck. */
export function resolveAssignedJudge(input: {
  sex?: DogSex | null;
  judges: Iterable<string>;
  requested?: string | null;
  fallback?: string | null;
  sunday?: boolean;
  se?: boolean;
  eventKind?: string | null;
  competitionDay?: string | null;
  showDate?: string | null;
}): string {
  const day =
    input.se || input.eventKind === "se"
      ? "se"
      : input.sunday
        ? "sunday"
        : assignmentDayForEntry({
            eventKind: input.eventKind,
            competitionDay: input.competitionDay,
            showDate: input.showDate,
          }) ?? "saturday";
  return (
    judgeForAssignment({
      sex: input.sex,
      judges: input.judges,
      day,
    }) ||
    (input.requested ?? "").trim() ||
    (input.fallback ?? "").trim()
  );
}

/** Correct judge for this appearance — schedule first, then stored names. */
export function resolveAppearanceJudge(input: {
  entry?: {
    sex?: DogSex | null;
    event_kind?: string | null;
    competition_day?: string | null;
  } | null;
  show?: {
    date?: string | null;
    judge?: string | null;
    judges?: string[] | null;
  } | null;
  critiqueJudge?: string | null;
  seJudge?: string | null;
}): string {
  const judges = syncShowJudges({
    judge: input.show?.judge ?? undefined,
    judges: input.show?.judges ?? undefined,
  }).judges;
  const day = assignmentDayForEntry({
    eventKind: input.entry?.event_kind,
    competitionDay: input.entry?.competition_day,
    showDate: input.show?.date,
  });
  return (
    judgeForAssignment({
      sex: input.entry?.sex,
      judges,
      day,
    }) ||
    (input.critiqueJudge ?? "").trim() ||
    (day === "se" ? (input.seJudge ?? "").trim() : "") ||
    (input.show?.judge ?? "").trim()
  );
}

export function applySeJudgeAssignment<T extends { judge: string; judge_signature?: string }>(
  form: T,
  judges: Iterable<string>,
): T {
  const assigned = judgeForAssignment({ judges, day: "se" });
  if (!assigned) return form;
  const signature = (form.judge_signature ?? "").trim();
  return {
    ...form,
    judge: assigned,
    ...(form.judge_signature !== undefined
      ? {
          judge_signature:
            !signature || HAMID.test(signature) ? assigned : form.judge_signature,
        }
      : {}),
  };
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
  judges?: Iterable<string>;
  sex?: DogSex | null;
  eventKind?: string | null;
  competitionDay?: string | null;
  showDate?: string | null;
}): string {
  if (
    input.judges != null ||
    input.eventKind != null ||
    input.competitionDay != null ||
    input.showDate != null ||
    input.sex != null
  ) {
    return resolveAppearanceJudge({
      entry: {
        sex: input.sex,
        event_kind: input.eventKind,
        competition_day: input.competitionDay,
      },
      show: {
        date: input.showDate,
        judge: input.showJudge,
        judges: input.judges ? [...input.judges] : undefined,
      },
      critiqueJudge: input.critiqueJudge,
      seJudge: input.seJudge,
    });
  }
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
