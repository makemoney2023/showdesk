import { describe, expect, it } from "vitest";
import {
  REPORT_UNASSIGNED_JUDGE,
  reportAppearanceJudge,
  reportBrowseDay,
  reportJudgeChoices,
  reportRowMatchesDay,
  reportRowMatchesFilter,
  reportRowMatchesJudge,
  reportSearchFromParams,
  sanitizeReportJudgeFilter,
} from "./report-filters";

describe("reportRowMatchesFilter", () => {
  const ready = {
    documents: [
      { available: true, printable: true },
      { available: false },
    ],
    deliveryStatus: "sent" as const,
  };
  const missing = {
    documents: [{ available: true }, { available: false }],
    deliveryStatus: "pending" as const,
  };
  const failed = {
    documents: [{ available: true, printable: true }, { available: false }],
    deliveryStatus: "failed" as const,
  };
  const blocked = {
    documents: [{ available: true, printable: true }],
    deliveryStatus: "blocked" as const,
  };

  it("keeps every row on the all filter", () => {
    expect(reportRowMatchesFilter(ready, "all")).toBe(true);
    expect(reportRowMatchesFilter(missing, "all")).toBe(true);
  });

  it("treats printable dogs as ready even when other artifacts are missing", () => {
    expect(reportRowMatchesFilter(ready, "ready")).toBe(true);
    expect(reportRowMatchesFilter(missing, "ready")).toBe(false);
    expect(reportRowMatchesFilter(missing, "missing")).toBe(true);
    expect(reportRowMatchesFilter(ready, "missing")).toBe(true);
    expect(reportRowMatchesFilter(failed, "delivery_failed")).toBe(true);
    expect(reportRowMatchesFilter(ready, "delivery_failed")).toBe(false);
    expect(reportRowMatchesFilter(blocked, "delivery_blocked")).toBe(true);
    expect(reportRowMatchesFilter(ready, "delivery_blocked")).toBe(false);
  });
});

describe("reportRowMatchesDay", () => {
  const se = { competition_day: "2026-09-04" };
  const saturday = { competition_day: "2026-09-05" };

  it("keeps every row on the all-dates chip, including SE", () => {
    expect(reportRowMatchesDay(se, "all")).toBe(true);
    expect(reportRowMatchesDay(saturday, "all")).toBe(true);
    expect(reportRowMatchesDay(se, "")).toBe(true);
  });

  it("filters to the selected competition day", () => {
    expect(reportRowMatchesDay(se, "2026-09-04")).toBe(true);
    expect(reportRowMatchesDay(saturday, "2026-09-04")).toBe(false);
    expect(reportRowMatchesDay(saturday, "2026-09-05")).toBe(true);
  });

  it("ignores the date chip while a search is active", () => {
    expect(reportBrowseDay("2026-09-05", "")).toBe("2026-09-05");
    expect(reportBrowseDay("2026-09-05", "rex")).toBe("all");
  });
});

describe("report judge filter", () => {
  const weekendShow = {
    date: "2026-09-05",
    judge: "Sandra Reck (ADRK)",
    judges: ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"],
  };

  it("uses the weekend schedule so each judge gets the dogs they judged", () => {
    expect(
      reportAppearanceJudge({
        entry: {
          sex: "R",
          event_kind: "conformation",
          competition_day: "2026-09-05",
        },
        show: weekendShow,
        critiqueJudge: "Sandra Reck (ADRK)",
      }),
    ).toBe("Hamid Falah (FCI-France)");
    expect(
      reportAppearanceJudge({
        entry: {
          sex: "H",
          event_kind: "se",
          competition_day: "2026-09-04",
        },
        show: weekendShow,
        seJudge: "Hamid Falah (FCI-France)",
      }),
    ).toBe("Sandra Reck (ADRK)");
  });

  it("keeps a stored judge when the schedule does not apply", () => {
    expect(
      reportAppearanceJudge({
        entry: { sex: "H" },
        show: {
          date: "2026-09-04",
          judge: "Sandra Reck",
          judges: ["Sandra Reck", "Maria Makomaski"],
        },
        critiqueJudge: "Maria Makomaski",
      }),
    ).toBe("Maria Makomaski");
  });

  it("does not invent the show's first judge for a critique with no name", () => {
    expect(
      reportAppearanceJudge({
        entry: { sex: "R" },
        show: weekendShow,
      }),
    ).toBe("");
  });

  it("filters the view and leaves every source critique in place", () => {
    const rows = [
      { id: "crit-sandra", judge: "Sandra Reck" },
      { id: "crit-maria", judge: "Maria Makomaski" },
      { id: "crit-open", judge: "" },
    ];
    const snapshot = structuredClone(rows);

    expect(
      rows
        .filter((row) => reportRowMatchesJudge(row.judge, "all"))
        .map((row) => row.id),
    ).toEqual(["crit-sandra", "crit-maria", "crit-open"]);
    expect(
      rows
        .filter((row) => reportRowMatchesJudge(row.judge, "Maria Makomaski"))
        .map((row) => row.id),
    ).toEqual(["crit-maria"]);
    expect(
      rows
        .filter((row) =>
          reportRowMatchesJudge(row.judge, REPORT_UNASSIGNED_JUDGE),
        )
        .map((row) => row.id),
    ).toEqual(["crit-open"]);
    expect(rows).toEqual(snapshot);
  });

  it("lists show judges and any extra name stored on a critique", () => {
    expect(
      reportJudgeChoices({
        showJudges: ["Sandra Reck", "Maria Makomaski"],
        rowJudges: ["Maria Makomaski", "Guest Judge", ""],
      }),
    ).toEqual(["Sandra Reck", "Maria Makomaski", "Guest Judge"]);
  });

  it("falls back to all judges when the selected name is not on the show", () => {
    expect(
      sanitizeReportJudgeFilter("Missing Judge", ["Sandra Reck"]),
    ).toBe("all");
    expect(
      sanitizeReportJudgeFilter("Sandra Reck", ["Sandra Reck"]),
    ).toBe("Sandra Reck");
    expect(
      sanitizeReportJudgeFilter(REPORT_UNASSIGNED_JUDGE, [
        REPORT_UNASSIGNED_JUDGE,
      ]),
    ).toBe(REPORT_UNASSIGNED_JUDGE);
  });
});

describe("reportSearchFromParams", () => {
  const entries = [{ id: "entry-1", armband: "31" }];

  it("prefers an explicit search query", () => {
    expect(
      reportSearchFromParams({
        q: " 33 ",
        entryId: "entry-1",
        entries,
      }),
    ).toBe("33");
  });

  it("falls back to the linked entry armband", () => {
    expect(
      reportSearchFromParams({
        q: "",
        entryId: "entry-1",
        entries,
      }),
    ).toBe("31");
    expect(
      reportSearchFromParams({ q: null, entryId: "missing", entries }),
    ).toBe("");
  });
});
