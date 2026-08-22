import { describe, expect, it } from "vitest";
import {
  catalogDivisionLabel,
  catalogMetadataError,
  competitionDaysWithEntries,
  defaultCompetitionDay,
  localCalendarIso,
  competitionDayLabel,
  competitionPoolKey,
  competitionPoolsWithDogs,
  nextDogInCompetitionPool,
  resolvedCatalogClass,
} from "./catalog-competition";

describe("catalog competition pools", () => {
  it("keeps Saturday and Sunday copies in independent pools", () => {
    const entries = [
      {
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
      {
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-06",
        catalog_class: "open" as const,
      },
    ];
    expect(entries.map(competitionPoolKey)).toEqual([
      "2026-09-05:open:H",
      "2026-09-06:open:H",
    ]);
    expect(competitionPoolsWithDogs(entries)).toHaveLength(2);
  });

  it("keeps Puppy III separate from Youth I", () => {
    const pools = competitionPoolsWithDogs([
      {
        class_id: "jugendklasse-i",
        sex: "H",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "puppy-iii",
      },
      {
        class_id: "jugendklasse-i",
        sex: "H",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "youth-i",
      },
    ]);
    expect(pools.map((pool) => pool.label)).toEqual([
      "Puppy Class III — Female (Hündin)",
      "Youth I — Female (Hündin)",
    ]);
  });

  it("excludes SE and supports legacy demo entries", () => {
    const se = {
      class_id: "offene-klasse" as const,
      sex: "R" as const,
      event_kind: "se" as const,
      competition_day: "2026-09-04",
      catalog_class: "standard-evaluation" as const,
    };
    expect(competitionPoolKey(se)).toBeNull();
    expect(catalogDivisionLabel(se)).toBe("Standard Evaluation (SE)");
    expect(
      resolvedCatalogClass({
        class_id: "zwischenklasse",
      }),
    ).toBe("youth-i");
    expect(
      competitionPoolKey({
        class_id: "zwischenklasse",
        sex: "R",
      }),
    ).toBe(":youth-i:R");
  });

  it("formats catalog dates without UTC drift", () => {
    expect(competitionDayLabel("2026-09-05")).toBe(
      "Saturday, September 5",
    );
  });

  it("summarizes days and selects today or the nearest upcoming day", () => {
    const days = competitionDaysWithEntries([
      { event_kind: "se", competition_day: "2026-09-04" },
      { event_kind: "conformation", competition_day: "2026-09-05" },
      { event_kind: "conformation", competition_day: "2026-09-05" },
      { event_kind: "conformation", competition_day: "2026-09-06" },
    ]);
    expect(days.map((day) => [day.day, day.count])).toEqual([
      ["2026-09-04", 1],
      ["2026-09-05", 2],
      ["2026-09-06", 1],
    ]);
    expect(defaultCompetitionDay(days, "2026-09-05")).toBe("2026-09-05");
    expect(defaultCompetitionDay(days, "2026-09-01")).toBe("2026-09-04");
    expect(defaultCompetitionDay(days, "2026-09-10")).toBe("2026-09-06");
  });

  it("uses the browser-local date near midnight", () => {
    expect(localCalendarIso(new Date(2026, 8, 5, 23, 59))).toBe(
      "2026-09-05",
    );
  });

  it("advances only inside the same day, class, and sex pool", () => {
    const entries = [
      {
        id: "sat-1",
        armband: "1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
      {
        id: "sat-2",
        armband: "2",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
      {
        id: "sun-3",
        armband: "3",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-06",
        catalog_class: "open" as const,
      },
    ];
    expect(nextDogInCompetitionPool(entries, "sat-1")).toBe("sat-2");
    expect(nextDogInCompetitionPool(entries, "sat-2")).toBeNull();
  });
});

describe("catalogMetadataError", () => {
  it("requires event, day, and published class for scratch saves", () => {
    expect(catalogMetadataError({})).toBe("Catalog event is required");
    expect(
      catalogMetadataError({ event_kind: "conformation" }),
    ).toBe("Competition day is required");
    expect(
      catalogMetadataError({
        event_kind: "conformation",
        competition_day: "2026-09-05",
      }),
    ).toBe("Published catalog class is required");
    expect(
      catalogMetadataError({
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "youth-i",
      }),
    ).toBeNull();
  });
});
