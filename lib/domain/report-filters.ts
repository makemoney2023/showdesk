import type { DogSex } from "./class-division";
import { entryMatchesCompetitionDay } from "./catalog-competition";
import {
  assignmentDayForEntry,
  judgeForAssignment,
  normalizeJudgeNames,
  syncShowJudges,
} from "./show-judges";

/** Reports judge chip for rows with no stored or scheduled judge. */
export const REPORT_UNASSIGNED_JUDGE = "unassigned";

export type ReportDeskFilter =
  | "all"
  | "ready"
  | "missing"
  | "delivery_failed"
  | "delivery_blocked";

export function reportDeskRowKind(input: {
  documents: { available: boolean; printable?: boolean }[];
  deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
}): Exclude<ReportDeskFilter, "all">[] {
  const kinds: Exclude<ReportDeskFilter, "all">[] = [];
  if (input.documents.some((doc) => doc.printable)) {
    kinds.push("ready");
  }
  if (input.documents.some((doc) => !doc.available)) {
    kinds.push("missing");
  }
  if (input.deliveryStatus === "failed") {
    kinds.push("delivery_failed");
  }
  if (input.deliveryStatus === "blocked") {
    kinds.push("delivery_blocked");
  }
  return kinds;
}

export function reportRowMatchesFilter(
  input: {
    documents: { available: boolean; printable?: boolean }[];
    deliveryStatus?: "pending" | "sent" | "failed" | "blocked" | null;
  },
  filter: ReportDeskFilter,
): boolean {
  if (filter === "all") return true;
  return reportDeskRowKind(input).includes(filter);
}

/** Reports date chips. `"all"` keeps SE + Saturday + Sunday visible. */
export function reportRowMatchesDay(
  entry: { competition_day?: string },
  selectedDay: string,
): boolean {
  return entryMatchesCompetitionDay(entry, selectedDay);
}

/** Search looks across the weekend; date chips apply only while browsing. */
export function reportBrowseDay(
  selectedDay: string,
  search: string,
): string {
  return search.trim() ? "all" : selectedDay;
}

/**
 * Judge named on this appearance. Schedule wins when it applies, then the
 * critique's own judge, then the SE judge. Never falls back to the show's
 * first judge, so a critique without a name stays visible under All judges.
 * This is a label for filtering only — it does not rewrite the critique.
 */
export function reportAppearanceJudge(input: {
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
  const day = assignmentDayForEntry({
    eventKind: input.entry?.event_kind,
    competitionDay: input.entry?.competition_day,
    showDate: input.show?.date,
  });
  const scheduled = judgeForAssignment({
    sex: input.entry?.sex,
    judges: syncShowJudges({
      judge: input.show?.judge ?? undefined,
      judges: input.show?.judges ?? undefined,
    }).judges,
    day,
  });
  if (scheduled) return scheduled;
  const critiqueJudge = (input.critiqueJudge ?? "").trim();
  if (critiqueJudge) return critiqueJudge;
  if (day === "se" || day == null) {
    return (input.seJudge ?? "").trim();
  }
  return "";
}

/** `"all"` keeps every critique on screen, including ones with no judge. */
export function reportRowMatchesJudge(
  judgeName: string,
  selectedJudge: string,
): boolean {
  const selected = selectedJudge.trim();
  if (!selected || selected === "all") return true;
  if (selected === REPORT_UNASSIGNED_JUDGE) return judgeName.trim() === "";
  return judgeName.trim() === selected;
}

/** Show roster first, then any extra name actually stored on a row. */
export function reportJudgeChoices(input: {
  showJudges?: Iterable<string | null | undefined>;
  rowJudges?: Iterable<string | null | undefined>;
}): string[] {
  return normalizeJudgeNames([
    ...(input.showJudges ?? []),
    ...(input.rowJudges ?? []),
  ]);
}

/**
 * An unknown judge chip falls back to all so the list cannot go blank
 * and hide every critique.
 */
export function sanitizeReportJudgeFilter(
  selected: string,
  judges: readonly string[],
): string {
  const name = selected.trim();
  if (!name || name === "all") return "all";
  return judges.includes(name) ? name : "all";
}

/** Review and other desk screens can open Reports on one dog. */
export function reportSearchFromParams(input: {
  q?: string | null;
  entryId?: string | null;
  entries: Array<{ id: string; armband?: string }>;
}): string {
  const query = input.q?.trim() ?? "";
  if (query) return query;
  if (!input.entryId) return "";
  return (
    input.entries.find((entry) => entry.id === input.entryId)?.armband?.trim() ??
    ""
  );
}
