import { describe, expect, it } from "vitest";
import {
  canRecordWithJudge,
  formatShowJudges,
  judgeStorageKey,
  normalizeJudgeNames,
  resolvePdfJudge,
  syncShowJudges,
} from "./show-judges";

describe("normalizeJudgeNames", () => {
  it("trims, drops blanks, and drops exact duplicates", () => {
    expect(
      normalizeJudgeNames(["  Müller  ", "", "Schmidt", "Müller", "  "]),
    ).toEqual(["Müller", "Schmidt"]);
  });
});

describe("syncShowJudges", () => {
  it("uses the list as source of truth and sets judge to the first name", () => {
    expect(syncShowJudges({ judge: "Old", judges: [" Müller ", "Schmidt"] })).toEqual({
      judges: ["Müller", "Schmidt"],
      judge: "Müller",
    });
  });

  it("migrates a legacy single judge into the list", () => {
    expect(syncShowJudges({ judge: "Schmidt" })).toEqual({
      judges: ["Schmidt"],
      judge: "Schmidt",
    });
  });

  it("returns empty when neither list nor legacy name has a value", () => {
    expect(syncShowJudges({ judge: "  ", judges: ["", " "] })).toEqual({
      judges: [],
      judge: "",
    });
  });
});

describe("canRecordWithJudge", () => {
  it("allows record only when the pick is still on the show list", () => {
    expect(canRecordWithJudge("Müller", ["Müller", "Schmidt"])).toBe(true);
    expect(canRecordWithJudge("Gone", ["Müller", "Schmidt"])).toBe(false);
    expect(canRecordWithJudge("", ["Müller"])).toBe(false);
    expect(canRecordWithJudge(null, ["Müller"])).toBe(false);
  });
});

describe("resolvePdfJudge", () => {
  it("prefers critique snapshot, then SE, then the show fallback", () => {
    expect(
      resolvePdfJudge({
        critiqueJudge: "A",
        seJudge: "B",
        showJudge: "C",
      }),
    ).toBe("A");
    expect(
      resolvePdfJudge({
        critiqueJudge: "  ",
        seJudge: "B",
        showJudge: "C",
      }),
    ).toBe("B");
    expect(
      resolvePdfJudge({
        critiqueJudge: "",
        seJudge: "",
        showJudge: "C",
      }),
    ).toBe("C");
  });
});

describe("formatShowJudges", () => {
  it("joins names or falls back to Judge TBD", () => {
    expect(formatShowJudges(["Müller", "Schmidt"])).toBe("Müller · Schmidt");
    expect(formatShowJudges([])).toBe("Judge TBD");
  });
});

describe("judgeStorageKey", () => {
  it("keys the sticky pick by show id", () => {
    expect(judgeStorageKey("show-1")).toBe("sss-judge:show-1");
  });
});
