import { describe, expect, it } from "vitest";
import {
  classDivisionIndex,
  divisionKey,
  divisionLabel,
  divisionsWithDogs,
  entryMatchesDivision,
  nextDogInDivision,
  normalizeDogSex,
  parseDivisionKey,
} from "./class-division";

describe("class divisions", () => {
  it("normalizes documented male and female roster values", () => {
    for (const value of ["R", "Rüde", "Ruede", "male", "M"]) {
      expect(normalizeDogSex(value)).toBe("R");
    }
    for (const value of ["H", "Hündin", "Huendin", "female", "F"]) {
      expect(normalizeDogSex(value)).toBe("H");
    }
    expect(normalizeDogSex("unknown")).toBeNull();
    expect(normalizeDogSex("")).toBeNull();
  });

  it("builds and parses stable division keys and labels", () => {
    const division = { class_id: "offene-klasse" as const, sex: "H" as const };
    expect(divisionKey(division)).toBe("offene-klasse:H");
    expect(parseDivisionKey("offene-klasse:H")).toEqual(division);
    expect(parseDivisionKey("offene-klasse:X")).toBeNull();
    expect(divisionLabel(division)).toBe("Open Class — Female (Hündin)");
    expect(divisionLabel(division, "short")).toBe("Open Class — Female");
  });

  it("returns populated divisions in ADRK class then male/female order", () => {
    expect(
      divisionsWithDogs([
        { class_id: "offene-klasse", sex: "H" },
        { class_id: "babyklasse", sex: "H" },
        { class_id: "babyklasse", sex: "R" },
        { class_id: "babyklasse", sex: "H" },
      ]),
    ).toEqual([
      {
        class_id: "babyklasse",
        sex: "R",
        key: "babyklasse:R",
        count: 1,
      },
      {
        class_id: "babyklasse",
        sex: "H",
        key: "babyklasse:H",
        count: 2,
      },
      {
        class_id: "offene-klasse",
        sex: "H",
        key: "offene-klasse:H",
        count: 1,
      },
    ]);
  });

  it("matches division filters and sorts male before female", () => {
    const male = { class_id: "zwischenklasse" as const, sex: "R" as const };
    const female = { class_id: "zwischenklasse" as const, sex: "H" as const };
    expect(entryMatchesDivision(male, "all")).toBe(true);
    expect(entryMatchesDivision(male, "zwischenklasse:R")).toBe(true);
    expect(entryMatchesDivision(male, "zwischenklasse:H")).toBe(false);
    expect(classDivisionIndex(male)).toBeLessThan(classDivisionIndex(female));
  });

  it("advances only within the current class and sex division", () => {
    const entries = [
      {
        id: "m2",
        armband: "102",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "f1",
        armband: "101",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
      },
      {
        id: "m1",
        armband: "100",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
    ];
    expect(nextDogInDivision(entries, "m1")).toBe("m2");
    expect(nextDogInDivision(entries, "m2")).toBeNull();
    expect(nextDogInDivision(entries, "f1")).toBeNull();
  });
});
