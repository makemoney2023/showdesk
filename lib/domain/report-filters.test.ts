import { describe, expect, it } from "vitest";
import { reportRowMatchesFilter } from "./report-filters";

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
