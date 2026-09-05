import { describe, expect, it } from "vitest";
import {
  reportBrowseDay,
  reportRowMatchesDay,
  reportRowMatchesFilter,
} from "./report-filters";

describe("reportRowMatchesFilter", () => {
  const ready = {
    documents: [
      { available: true, printable: true },
      { available: false },
    ],
    deliveryStatus: "sent" as const,
  };
  const missing = {
    documents: [{ available: true }, { available: false }],
    deliveryStatus: "pending" as const,
  };
  const failed = {
    documents: [{ available: true, printable: true }, { available: false }],
    deliveryStatus: "failed" as const,
  };
  const blocked = {
    documents: [{ available: true, printable: true }],
    deliveryStatus: "blocked" as const,
  };

  it("keeps every row on the all filter", () => {
    expect(reportRowMatchesFilter(ready, "all")).toBe(true);
    expect(reportRowMatchesFilter(missing, "all")).toBe(true);
  });

  it("treats printable dogs as ready even when other artifacts are missing", () => {
    expect(reportRowMatchesFilter(ready, "ready")).toBe(true);
    expect(reportRowMatchesFilter(missing, "ready")).toBe(false);
    expect(reportRowMatchesFilter(missing, "missing")).toBe(true);
    expect(reportRowMatchesFilter(ready, "missing")).toBe(true);
    expect(reportRowMatchesFilter(failed, "delivery_failed")).toBe(true);
    expect(reportRowMatchesFilter(ready, "delivery_failed")).toBe(false);
    expect(reportRowMatchesFilter(blocked, "delivery_blocked")).toBe(true);
    expect(reportRowMatchesFilter(ready, "delivery_blocked")).toBe(false);
  });
});

describe("reportRowMatchesDay", () => {
  const se = { competition_day: "2026-09-04" };
  const saturday = { competition_day: "2026-09-05" };

  it("keeps every row on the all-dates chip, including SE", () => {
    expect(reportRowMatchesDay(se, "all")).toBe(true);
    expect(reportRowMatchesDay(saturday, "all")).toBe(true);
    expect(reportRowMatchesDay(se, "")).toBe(true);
  });

  it("filters to the selected competition day", () => {
    expect(reportRowMatchesDay(se, "2026-09-04")).toBe(true);
    expect(reportRowMatchesDay(saturday, "2026-09-04")).toBe(false);
    expect(reportRowMatchesDay(saturday, "2026-09-05")).toBe(true);
  });

  it("ignores the date chip while a search is active", () => {
    expect(reportBrowseDay("2026-09-05", "")).toBe("2026-09-05");
    expect(reportBrowseDay("2026-09-05", "rex")).toBe("all");
  });
});
