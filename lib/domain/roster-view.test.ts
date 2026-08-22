import { describe, expect, it } from "vitest";
import {
  compareRosterEntries,
  entryMatchesClassFilter,
  rosterEmptyMessage,
  sanitizeRosterClassFilter,
  visibleRosterEntries,
} from "./roster-view";

const rows = [
  {
    id: "v",
    class_id: "veteranenklasse" as const,
    sex: "H" as const,
    armband: "12",
    dog_name: "Vega",
    owner: "Ann",
  },
  {
    id: "z2",
    class_id: "zwischenklasse" as const,
    sex: "R" as const,
    armband: "102",
    dog_name: "Zeno",
    owner: "Bo",
  },
  {
    id: "z1",
    class_id: "zwischenklasse" as const,
    sex: "R" as const,
    armband: "11",
    dog_name: "Rex Happy Path",
    owner: "Max Mustermann",
  },
];

describe("entryMatchesClassFilter", () => {
  it("keeps every dog on all, otherwise matches class_id", () => {
    expect(entryMatchesClassFilter(rows[0], "all")).toBe(true);
    expect(entryMatchesClassFilter(rows[0], "veteranenklasse")).toBe(true);
    expect(entryMatchesClassFilter(rows[0], "zwischenklasse")).toBe(false);
  });
});

describe("compareRosterEntries", () => {
  it("orders by ADRK class, then numeric armband", () => {
    const ordered = [...rows].toSorted((a, b) =>
      compareRosterEntries(a, b, "class"),
    );
    expect(ordered.map((row) => row.id)).toEqual(["z1", "z2", "v"]);
  });

  it("orders by numeric armband when asked", () => {
    const ordered = [...rows].toSorted((a, b) =>
      compareRosterEntries(a, b, "armband"),
    );
    expect(ordered.map((row) => row.armband)).toEqual(["11", "12", "102"]);
  });
});

describe("visibleRosterEntries", () => {
  it("filters by class and search, then sorts", () => {
    expect(
      visibleRosterEntries(rows, {
        search: "rex",
        classFilter: "zwischenklasse",
        sort: "class",
      }).map((row) => row.id),
    ).toEqual(["z1"]);
    expect(
      visibleRosterEntries(rows, {
        search: "",
        classFilter: "all",
        sort: "class",
      }).map((row) => row.id),
    ).toEqual(["z1", "z2", "v"]);
  });
});

describe("rosterEmptyMessage", () => {
  it("explains empty, search, and class misses", () => {
    expect(
      rosterEmptyMessage({
        entryCount: 0,
        visibleCount: 0,
        search: "",
        classFilter: "all",
      }),
    ).toBe("No dogs on this roster yet.");
    expect(
      rosterEmptyMessage({
        entryCount: 3,
        visibleCount: 0,
        search: "bella",
        classFilter: "all",
      }),
    ).toBe("No dogs match this search.");
    expect(
      rosterEmptyMessage({
        entryCount: 3,
        visibleCount: 0,
        search: "",
        classFilter: "babyklasse",
      }),
    ).toBe("No dogs in this class.");
    expect(
      rosterEmptyMessage({
        entryCount: 3,
        visibleCount: 1,
        search: "rex",
        classFilter: "all",
      }),
    ).toBeNull();
  });
});

describe("sanitizeRosterClassFilter", () => {
  it("falls back to all when the class is not on the roster", () => {
    expect(sanitizeRosterClassFilter("babyklasse", rows)).toBe("all");
    expect(sanitizeRosterClassFilter("zwischenklasse", rows)).toBe(
      "zwischenklasse",
    );
  });
});
