import { describe, expect, it } from "vitest";
import { reportRowMatchesFilter } from "./report-filters";

describe("reportRowMatchesFilter", () => {
  const ready = {
    documents: [{ available: true }, { available: true }],
    deliveryStatus: "sent" as const,
  };
  const missing = {
    documents: [{ available: true }, { available: false }],
    deliveryStatus: "pending" as const,
  };
  const failed = {
    documents: [{ available: true }, { available: false }],
    deliveryStatus: "failed" as const,
  };

  it("keeps every row on the all filter", () => {
    expect(reportRowMatchesFilter(ready, "all")).toBe(true);
    expect(reportRowMatchesFilter(missing, "all")).toBe(true);
  });

  it("separates ready, missing, and failed delivery", () => {
    expect(reportRowMatchesFilter(ready, "ready")).toBe(true);
    expect(reportRowMatchesFilter(missing, "ready")).toBe(false);
    expect(reportRowMatchesFilter(missing, "missing")).toBe(true);
    expect(reportRowMatchesFilter(ready, "missing")).toBe(false);
    expect(reportRowMatchesFilter(failed, "delivery_failed")).toBe(true);
    expect(reportRowMatchesFilter(ready, "delivery_failed")).toBe(false);
  });
});
