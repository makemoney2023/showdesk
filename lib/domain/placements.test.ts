import { describe, expect, it } from "vitest";
import { upsertPlacements } from "./placements";
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
