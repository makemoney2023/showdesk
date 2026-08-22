import { describe, expect, it } from "vitest";
import {
  assignClassPlacement,
  formwertSortRank,
  placementEntriesBelongToShow,
  placementsSuggestedFromFormwert,
  resolvePlacementInputs,
  resolveFormwertByEntryId,
  sortDogsForPlacement,
  upsertPlacements,
} from "./placements";
import type { PlacementRecord } from "@/lib/types";

describe("upsertPlacements", () => {
  it("replaces placement for same entry in show", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e1",
        placement: 1,
      },
      {
        id: "p2",
        show_id: "s2",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e9",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e1",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "",
          catalog_class: "youth-i",
          placement: 3,
        },
      ],
      () => "p-new",
    );
    expect(next.find((p) => p.show_id === "s2")?.placement).toBe(2);
    expect(next.find((p) => p.entry_id === "e1")?.placement).toBe(3);
  });

  it("clears placement when null", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "H",
        entry_id: "e1",
        placement: 1,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e1",
          class_id: "zwischenklasse",
          sex: "H",
          competition_day: "",
          catalog_class: "youth-i",
          placement: null,
        },
      ],
      () => "p-new",
    );
    expect(next.filter((p) => p.show_id === "s1")).toHaveLength(0);
  });

  it("treats rows as a full-show replacement", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e1",
        placement: 1,
      },
      {
        id: "p2",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e2",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e2",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "",
          catalog_class: "youth-i",
          placement: 1,
        },
      ],
      () => "p-new",
    );
    expect(next.filter((placement) => placement.show_id === "s1")).toEqual([
      {
        id: "p-new",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "",
        catalog_class: "youth-i",
        entry_id: "e2",
        placement: 1,
      },
    ]);
  });
});

describe("formwertSortRank", () => {
  it("ranks vv best and unrated last", () => {
    expect(formwertSortRank("vv")).toBeLessThan(formwertSortRank("V"));
    expect(formwertSortRank("V")).toBeLessThan(formwertSortRank("Sg"));
    expect(formwertSortRank("Sg")).toBeLessThan(formwertSortRank("G"));
    expect(formwertSortRank("G")).toBeLessThan(formwertSortRank(null));
    expect(formwertSortRank(null)).toBe(formwertSortRank(undefined));
  });
});

describe("sortDogsForPlacement", () => {
  it("orders dogs by Formwert then armband", () => {
    const dogs = [
      { id: "e1", armband: "12", dog_name: "A" },
      { id: "e2", armband: "3", dog_name: "B" },
      { id: "e3", armband: "7", dog_name: "C" },
      { id: "e4", armband: "1", dog_name: "D" },
    ];
    const sorted = sortDogsForPlacement(dogs, {
      e1: "Sg",
      e2: "V",
      e3: "V",
      e4: null,
    });
    expect(sorted.map((d) => d.id)).toEqual(["e2", "e3", "e1", "e4"]);
  });
});

describe("resolveFormwertByEntryId", () => {
  it("uses the newest critique formwert per entry", () => {
    expect(
      resolveFormwertByEntryId([
        {
          entry_id: "e1",
          updated_at: "2026-08-01T10:00:00.000Z",
          draft: { formwert: "Sg" },
        },
        {
          entry_id: "e1",
          updated_at: "2026-08-02T10:00:00.000Z",
          draft: { formwert: "V" },
        },
      ]),
    ).toEqual({ e1: "V" });
  });
});

describe("placementsSuggestedFromFormwert", () => {
  it("assigns 1–4 within each class from Formwert order", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "a", armband: "2", class_id: "zwischenklasse", sex: "R" },
        { id: "b", armband: "1", class_id: "zwischenklasse", sex: "R" },
        { id: "c", armband: "3", class_id: "zwischenklasse", sex: "R" },
        { id: "d", armband: "4", class_id: "zwischenklasse", sex: "R" },
        { id: "e", armband: "5", class_id: "zwischenklasse", sex: "R" },
        { id: "f", armband: "9", class_id: "offene-klasse", sex: "H" },
        { id: "g", armband: "8", class_id: "offene-klasse", sex: "H" },
      ],
      {
        a: "Sg",
        b: "V",
        c: "vv",
        d: "G",
        e: "V",
        f: "V",
        g: "Sg",
      },
    );
    expect(suggested).toEqual([
      { entry_id: "c", placement: 1 },
      { entry_id: "b", placement: 2 },
      { entry_id: "e", placement: 3 },
      { entry_id: "a", placement: 4 },
      { entry_id: "d", placement: null },
      { entry_id: "f", placement: 1 },
      { entry_id: "g", placement: 2 },
    ]);
  });

  it("rejects placements for dogs that are not on the show", () => {
    expect(
      placementEntriesBelongToShow(
        [{ entry_id: "e1", class_id: "zwischenklasse", placement: 1 }],
        [
          {
            id: "e1",
            show_id: "other",
            class_id: "zwischenklasse",
            sex: "R",
          },
        ],
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("rejects class_id that does not match the roster row", () => {
    expect(
      placementEntriesBelongToShow(
        [{ entry_id: "e1", class_id: "offene-klasse", placement: 1 }],
        [
          {
            id: "e1",
            show_id: "s1",
            class_id: "zwischenklasse",
            sex: "R",
          },
        ],
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("skips unrated dogs when assigning top-4", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "a", armband: "1", class_id: "zwischenklasse", sex: "H" },
        { id: "b", armband: "2", class_id: "zwischenklasse", sex: "H" },
      ],
      { a: null, b: "V" },
    );
    expect(suggested).toEqual([
      { entry_id: "b", placement: 1 },
      { entry_id: "a", placement: null },
    ]);
  });

  it("assigns male and female place 1 independently", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "male", armband: "1", class_id: "offene-klasse", sex: "R" },
        { id: "female", armband: "2", class_id: "offene-klasse", sex: "H" },
      ],
      { male: "V", female: "V" },
    );
    expect(suggested).toEqual([
      { entry_id: "male", placement: 1 },
      { entry_id: "female", placement: 1 },
    ]);
  });

  it("rejects duplicate places inside one division but allows them across sex", () => {
    const entries = [
      {
        id: "m1",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "m2",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "f1",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
      },
    ];
    expect(
      resolvePlacementInputs(
        [
          { entry_id: "m1", placement: 1 },
          { entry_id: "f1", placement: 1 },
        ],
        entries,
        "s1",
      ).valid,
    ).toBe(true);
    expect(
      resolvePlacementInputs(
        [
          { entry_id: "m1", placement: 1 },
          { entry_id: "m2", placement: 1 },
        ],
        entries,
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("allows the same place on Saturday and Sunday", () => {
    const entries = [
      {
        id: "sat",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
      {
        id: "sun",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-06",
        catalog_class: "open" as const,
      },
    ];
    const result = resolvePlacementInputs(
      [
        { entry_id: "sat", placement: 1 },
        { entry_id: "sun", placement: 1 },
      ],
      entries,
      "s1",
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rows.map((row) => row.competition_day)).toEqual([
        "2026-09-05",
        "2026-09-06",
      ]);
    }
  });
});

describe("assignClassPlacement", () => {
  const classIds = ["e1", "e2", "e3"];

  it("assigns a place and swaps when another dog holds it", () => {
    const swapped = assignClassPlacement(
      { e1: 1, e2: 2 },
      "e3",
      1,
      classIds,
    );
    expect(swapped.e3).toBe(1);
    expect(swapped.e1).toBe("");
    expect(swapped.e2).toBe(2);
  });

  it("clears a place when the same button is tapped again", () => {
    const cleared = assignClassPlacement({ e1: 2 }, "e1", 2, classIds);
    expect(cleared.e1).toBe("");
  });

  it("swaps two dogs when both already have places", () => {
    const swapped = assignClassPlacement(
      { e1: 1, e2: 3 },
      "e1",
      3,
      classIds,
    );
    expect(swapped.e1).toBe(3);
    expect(swapped.e2).toBe(1);
  });
});
