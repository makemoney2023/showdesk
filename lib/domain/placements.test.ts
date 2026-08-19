import { describe, expect, it } from "vitest";
import {
  formwertSortRank,
  placementsSuggestedFromFormwert,
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
        entry_id: "e1",
        placement: 1,
      },
      {
        id: "p2",
        show_id: "s2",
        class_id: "zwischenklasse",
        entry_id: "e9",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [{ entry_id: "e1", class_id: "zwischenklasse", placement: 3 }],
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
        entry_id: "e1",
        placement: 1,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [{ entry_id: "e1", class_id: "zwischenklasse", placement: null }],
      () => "p-new",
    );
    expect(next.filter((p) => p.show_id === "s1")).toHaveLength(0);
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
        { id: "a", armband: "2", class_id: "zwischenklasse" },
        { id: "b", armband: "1", class_id: "zwischenklasse" },
        { id: "c", armband: "3", class_id: "zwischenklasse" },
        { id: "d", armband: "4", class_id: "zwischenklasse" },
        { id: "e", armband: "5", class_id: "zwischenklasse" },
        { id: "f", armband: "9", class_id: "offene-klasse" },
        { id: "g", armband: "8", class_id: "offene-klasse" },
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
      { entry_id: "c", class_id: "zwischenklasse", placement: 1 },
      { entry_id: "b", class_id: "zwischenklasse", placement: 2 },
      { entry_id: "e", class_id: "zwischenklasse", placement: 3 },
      { entry_id: "a", class_id: "zwischenklasse", placement: 4 },
      { entry_id: "d", class_id: "zwischenklasse", placement: null },
      { entry_id: "f", class_id: "offene-klasse", placement: 1 },
      { entry_id: "g", class_id: "offene-klasse", placement: 2 },
    ]);
  });

  it("skips unrated dogs when assigning top-4", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "a", armband: "1", class_id: "zwischenklasse" },
        { id: "b", armband: "2", class_id: "zwischenklasse" },
      ],
      { a: null, b: "V" },
    );
    expect(suggested).toEqual([
      { entry_id: "b", class_id: "zwischenklasse", placement: 1 },
      { entry_id: "a", class_id: "zwischenklasse", placement: null },
    ]);
  });
});
