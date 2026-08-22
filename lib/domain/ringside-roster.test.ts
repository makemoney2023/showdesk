import { describe, expect, it } from "vitest";
import type { AdrkClassId } from "./adrk-template";
import type { DogSex } from "./class-division";
import {
  ringsideEntryContextQuery,
  ringsideTileClassLabel,
  visibleRingsideEntries,
} from "./ringside-roster";

function entry(overrides: {
  id: string;
  armband: string;
  dog_name: string;
  owner?: string;
  competition_day: string;
  class_id?: AdrkClassId;
  sex?: DogSex;
  catalog_class?: "open" | "youth-i";
}) {
  return {
    class_id: "offene-klasse" as const,
    sex: "R" as const,
    event_kind: "conformation" as const,
    catalog_class: "open" as const,
    owner: "Owner",
    ...overrides,
  };
}

const saturdayMale = entry({
  id: "sat-rex",
  armband: "101",
  dog_name: "Rex Saturday",
  owner: "Max Mustermann",
  competition_day: "2026-09-05",
});
const saturdayFemale = entry({
  id: "sat-bella",
  armband: "102",
  dog_name: "Bella Saturday",
  sex: "H",
  competition_day: "2026-09-05",
});
const sundayRex = entry({
  id: "sun-rex",
  armband: "201",
  dog_name: "Rex Sunday",
  owner: "Other Owner",
  competition_day: "2026-09-06",
});
const sundayYouth = entry({
  id: "sun-youth",
  armband: "11",
  dog_name: "Youth Sunday",
  class_id: "jugendklasse-i",
  catalog_class: "youth-i",
  competition_day: "2026-09-06",
});

const roster = [sundayRex, saturdayFemale, sundayYouth, saturdayMale];

describe("visibleRingsideEntries", () => {
  it("browses only the selected day and pool when search is empty", () => {
    expect(
      visibleRingsideEntries(roster, {
        search: "",
        activeDay: "2026-09-05",
        activePool: "all",
      }).map((row) => row.id),
    ).toEqual(["sat-rex", "sat-bella"]);
    expect(
      visibleRingsideEntries(roster, {
        search: "   ",
        activeDay: "2026-09-05",
        activePool: "2026-09-05:open:R",
      }).map((row) => row.id),
    ).toEqual(["sat-rex"]);
  });

  it("searches every day and ignores the current pool chip", () => {
    expect(
      visibleRingsideEntries(roster, {
        search: "rex",
        activeDay: "2026-09-05",
        activePool: "2026-09-05:open:R",
      }).map((row) => row.id),
    ).toEqual(["sat-rex", "sun-rex"]);
    expect(
      visibleRingsideEntries(roster, {
        search: "201",
        activeDay: "2026-09-05",
        activePool: "all",
      }).map((row) => row.id),
    ).toEqual(["sun-rex"]);
    expect(
      visibleRingsideEntries(roster, {
        search: "other owner",
        activeDay: "2026-09-05",
        activePool: "all",
      }).map((row) => row.id),
    ).toEqual(["sun-rex"]);
  });

  it("orders search hits by day, then class/sex, then armband", () => {
    expect(
      visibleRingsideEntries(roster, {
        search: "sunday",
        activeDay: "2026-09-05",
        activePool: "all",
      }).map((row) => row.id),
    ).toEqual(["sun-youth", "sun-rex"]);
  });
});

describe("ringsideTileClassLabel", () => {
  it("adds the competition day when a search is active", () => {
    expect(ringsideTileClassLabel(sundayRex, "")).toBe(
      "Open — Male (Rüde)",
    );
    expect(ringsideTileClassLabel(sundayRex, "rex")).toBe(
      "Sunday, September 6 · Open — Male (Rüde)",
    );
  });
});

describe("ringsideEntryContextQuery", () => {
  it("keeps browse chips, but search links use the dog's own day", () => {
    expect(
      ringsideEntryContextQuery(sundayRex, {
        search: "",
        activeDay: "2026-09-05",
        activePool: "2026-09-05:open:R",
      }),
    ).toBe("date=2026-09-05&pool=2026-09-05%3Aopen%3AR");
    expect(
      ringsideEntryContextQuery(sundayRex, {
        search: "rex",
        activeDay: "2026-09-05",
        activePool: "2026-09-05:open:R",
      }),
    ).toBe("date=2026-09-06");
  });
});
