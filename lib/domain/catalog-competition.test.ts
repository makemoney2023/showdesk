import { describe, expect, it } from "vitest";
import {
  competitionDayLabel,
  competitionPoolKey,
  competitionPoolsWithDogs,
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
    expect(
      competitionPoolKey({
        class_id: "offene-klasse",
        sex: "R",
        event_kind: "se",
        competition_day: "2026-09-04",
        catalog_class: "standard-evaluation",
      }),
    ).toBeNull();
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
});
