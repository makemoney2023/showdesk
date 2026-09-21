import { describe, expect, it } from "vitest";
import {
  applySeJudgeAssignment,
  assignmentDayForEntry,
  canRecordWithJudge,
  formatShowJudges,
  isSundayConformationDay,
  judgeForAssignment,
  judgeForDogSex,
  judgeStorageKey,
  normalizeJudgeNames,
  resolveAppearanceJudge,
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

  it("assigns Reck to Friday SE regardless of sex", () => {
    expect(judgeForDogSex("R", judges, { se: true })).toBe(
      "Sandra Reck (ADRK)",
    );
    expect(judgeForDogSex("H", judges, { se: true })).toBe(
      "Sandra Reck (ADRK)",
    );
    expect(judgeForDogSex(null, judges, { day: "se" })).toBe(
      "Sandra Reck (ADRK)",
    );
  });
});

describe("assignmentDayForEntry", () => {
  it("maps Friday SE and Sat/Sun conformation onto the weekend", () => {
    expect(
      assignmentDayForEntry({
        eventKind: "se",
        competitionDay: "2026-09-04",
        showDate: "2026-09-05",
      }),
    ).toBe("se");
    expect(
      assignmentDayForEntry({
        eventKind: "conformation",
        competitionDay: "2026-09-05",
        showDate: "2026-09-05",
      }),
    ).toBe("saturday");
    expect(
      assignmentDayForEntry({
        eventKind: "conformation",
        competitionDay: "2026-09-06",
        showDate: "2026-09-05",
      }),
    ).toBe("sunday");
  });
});

describe("judgeForAssignment", () => {
  const judges = ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"];

  it("follows the published weekend ring schedule", () => {
    expect(judgeForAssignment({ judges, day: "se" })).toBe(
      "Sandra Reck (ADRK)",
    );
    expect(judgeForAssignment({ sex: "H", judges, day: "saturday" })).toBe(
      "Sandra Reck (ADRK)",
    );
    expect(judgeForAssignment({ sex: "R", judges, day: "saturday" })).toBe(
      "Hamid Falah (FCI-France)",
    );
    expect(judgeForAssignment({ sex: "H", judges, day: "sunday" })).toBe(
      "Hamid Falah (FCI-France)",
    );
    expect(judgeForAssignment({ sex: "R", judges, day: "sunday" })).toBe(
      "Sandra Reck (ADRK)",
    );
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

  it("assigns Reck to Friday SE even when Hamid is the sticky pick", () => {
    expect(
      resolveAssignedJudge({
        sex: "R",
        judges,
        requested: "Hamid Falah (FCI-France)",
        eventKind: "se",
        competitionDay: "2026-09-04",
        showDate: "2026-09-05",
      }),
    ).toBe("Sandra Reck (ADRK)");
  });
});

describe("resolveAppearanceJudge", () => {
  const judges = ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"];
  const show = {
    date: "2026-09-05",
    judge: "Sandra Reck (ADRK)",
    judges,
  };

  it("does not let a Friday SE name leak onto Saturday males", () => {
    expect(
      resolveAppearanceJudge({
        entry: {
          sex: "R",
          event_kind: "conformation",
          competition_day: "2026-09-05",
        },
        show,
        critiqueJudge: "Sandra Reck (ADRK)",
        seJudge: "Sandra Reck (ADRK)",
      }),
    ).toBe("Hamid Falah (FCI-France)");
  });

  it("corrects a Sunday female that was stamped with Reck", () => {
    expect(
      resolveAppearanceJudge({
        entry: {
          sex: "H",
          event_kind: "conformation",
          competition_day: "2026-09-06",
        },
        show,
        critiqueJudge: "Sandra Reck (ADRK)",
        seJudge: "Sandra Reck (ADRK)",
      }),
    ).toBe("Hamid Falah (FCI-France)");
  });

  it("keeps Reck on Friday SE when the stored form says Hamid", () => {
    expect(
      resolveAppearanceJudge({
        entry: {
          sex: "R",
          event_kind: "se",
          competition_day: "2026-09-04",
        },
        show,
        seJudge: "Hamid Falah (FCI-France)",
      }),
    ).toBe("Sandra Reck (ADRK)");
  });
});

describe("applySeJudgeAssignment", () => {
  it("replaces a Hamid stamp and empty signature with Reck", () => {
    expect(
      applySeJudgeAssignment(
        {
          judge: "Hamid Falah (FCI-France)",
          judge_signature: "Hamid Falah",
        },
        ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"],
      ),
    ).toEqual({
      judge: "Sandra Reck (ADRK)",
      judge_signature: "Sandra Reck (ADRK)",
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

  it("uses the weekend schedule when the appearance is known", () => {
    expect(
      resolvePdfJudge({
        critiqueJudge: "Sandra Reck (ADRK)",
        seJudge: "Sandra Reck (ADRK)",
        showJudge: "Sandra Reck (ADRK)",
        judges: ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"],
        sex: "R",
        eventKind: "conformation",
        competitionDay: "2026-09-05",
        showDate: "2026-09-05",
      }),
    ).toBe("Hamid Falah (FCI-France)");
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
