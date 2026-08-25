import { describe, expect, it } from "vitest";
import { showWeekendDays, weekendDayKind } from "./show-weekend";

describe("showWeekendDays", () => {
  it("maps a Saturday show date onto Friday SE + Sat/Sun conformation", () => {
    expect(showWeekendDays("2026-09-05")).toEqual({
      se: "2026-09-04",
      saturday: "2026-09-05",
      sunday: "2026-09-06",
    });
  });

  it("maps a Friday listed date to the same weekend", () => {
    expect(showWeekendDays("2026-09-04")).toEqual({
      se: "2026-09-04",
      saturday: "2026-09-05",
      sunday: "2026-09-06",
    });
  });

  it("maps a Sunday listed date backward to Saturday", () => {
    expect(showWeekendDays("2026-09-06")).toEqual({
      se: "2026-09-04",
      saturday: "2026-09-05",
      sunday: "2026-09-06",
    });
  });

  it("identifies which weekend day an entry uses", () => {
    const weekend = showWeekendDays("2026-09-05");
    expect(weekendDayKind(weekend, "2026-09-04")).toBe("se");
    expect(weekendDayKind(weekend, "2026-09-05")).toBe("saturday");
    expect(weekendDayKind(weekend, "2026-09-06")).toBe("sunday");
    expect(weekendDayKind(weekend, "2026-09-07")).toBeNull();
  });
});
