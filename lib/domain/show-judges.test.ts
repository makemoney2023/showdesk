import { describe, expect, it } from "vitest";
import {
  canRecordWithJudge,
  formatShowJudges,
  isSundayConformationDay,
  judgeForDogSex,
  judgeStorageKey,
  normalizeJudgeNames,
  resolveAssignedJudge,
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

describe("isSundayConformationDay", () => {
  it("treats 2026-09-06 as Sunday of the National Show weekend", () => {
    expect(
      isSundayConformationDay({
        competitionDay: "2026-09-06",
        showDate: "2026-09-05",
      }),
    ).toBe(true);
    expect(
      isSundayConformationDay({
        competitionDay: "2026-09-05",
        showDate: "2026-09-05",
      }),
    ).toBe(false);
  });
});

describe("judgeForDogSex", () => {
  const judges = ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"];

  it("assigns Hamid to males and Reck to females on Saturday", () => {
    expect(judgeForDogSex("R", judges)).toBe("Hamid Falah (FCI-France)");
    expect(judgeForDogSex("H", judges)).toBe("Sandra Reck (ADRK)");
  });

  it("swaps Sunday: Reck males and Hamid / Hamill females", () => {
    expect(judgeForDogSex("R", judges, { sunday: true })).toBe(
      "Sandra Reck (ADRK)",
    );
    expect(judgeForDogSex("H", judges, { sunday: true })).toBe(
      "Hamid Falah (FCI-France)",
    );
    expect(
      judgeForDogSex("H", ["Sandra Reck", "Judge Hamill"], { sunday: true }),
    ).toBe("Judge Hamill");
  });

  it("matches Hamill as the Saturday male judge name", () => {
    expect(judgeForDogSex("R", ["Sandra Reck", "Judge Hamill"])).toBe(
      "Judge Hamill",
    );
  });

  it("returns null when the sex or matching name is missing", () => {
    expect(judgeForDogSex("R", ["Sandra Reck (ADRK)"])).toBeNull();
    expect(judgeForDogSex("H", ["Hamid Falah (FCI-France)"])).toBeNull();
    expect(judgeForDogSex(null, judges)).toBeNull();
  });
});

describe("resolveAssignedJudge", () => {
  const judges = ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"];

  it("prefers the sex assignment over a requested sticky pick for conformation", () => {
    expect(
      resolveAssignedJudge({
        sex: "R",
        judges,
        requested: "Sandra Reck (ADRK)",
        fallback: "Sandra Reck (ADRK)",
      }),
    ).toBe("Hamid Falah (FCI-France)");
  });

  it("uses the Sunday swap when the entry is a Sunday dog", () => {
    expect(
      resolveAssignedJudge({
        sex: "R",
        judges,
        requested: "Hamid Falah (FCI-France)",
        competitionDay: "2026-09-06",
        showDate: "2026-09-05",
      }),
    ).toBe("Sandra Reck (ADRK)");
    expect(
      resolveAssignedJudge({
        sex: "H",
        judges,
        requested: "Sandra Reck (ADRK)",
        competitionDay: "2026-09-06",
        showDate: "2026-09-05",
      }),
    ).toBe("Hamid Falah (FCI-France)");
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
