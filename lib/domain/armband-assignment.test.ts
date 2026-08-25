import { describe, expect, it } from "vitest";
import {
  armbandRangeMax,
  assignArmbands,
  uniqueSlotsNeeded,
} from "./armband-assignment";

const existing = [
  { armband: "12", dog_id: "dog-a" },
  { armband: "50", dog_id: "dog-b" },
];

describe("assignArmbands", () => {
  it("gives sequential conformation numbers show-wide and copies Saturday onto SE", () => {
    expect(
      assignArmbands({
        existing,
        days: { se: true, saturday: true, sunday: false },
        mode: "sequential",
      }),
    ).toEqual({ saturday: "1", se: "1" });
  });

  it("uses different numbers for Saturday and Sunday", () => {
    expect(
      assignArmbands({
        existing,
        days: { se: true, saturday: true, sunday: true },
        mode: "sequential",
      }),
    ).toEqual({ saturday: "1", sunday: "2", se: "1" });
  });

  it("reuses Sunday's number when the dog is SE + Sunday only", () => {
    expect(
      assignArmbands({
        existing,
        days: { se: true, saturday: false, sunday: true },
        mode: "sequential",
      }),
    ).toEqual({ sunday: "1", se: "1" });
  });

  it("gives SE-only dogs their own next number", () => {
    expect(
      assignArmbands({
        existing,
        days: { se: true, saturday: false, sunday: false },
        mode: "sequential",
      }),
    ).toEqual({ se: "1" });
  });

  it("picks unused numbers inside a dog-count range when random", () => {
    const assigned = assignArmbands({
      existing: [{ armband: "1", dog_id: "dog-a" }],
      days: { se: false, saturday: true, sunday: false },
      mode: "random",
      random: () => 0,
    });
    expect(assigned.saturday).toBe("2");
  });
});

describe("armband range", () => {
  it("expands past dog count when both-day dogs need extra numbers", () => {
    expect(uniqueSlotsNeeded({ se: true, saturday: true, sunday: true })).toBe(
      2,
    );
    expect(
      armbandRangeMax({
        existing: [{ armband: "1", dog_id: "dog-a" }],
        newUniqueSlots: 2,
      }),
    ).toBe(3);
  });
});
