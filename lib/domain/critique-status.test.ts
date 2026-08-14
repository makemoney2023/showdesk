import { describe, expect, it } from "vitest";
import {
  canRelease,
  canTransition,
  isReviewable,
  assertTransition,
} from "./critique-status";

describe("critique-status", () => {
  it("allows processing to pending review", () => {
    expect(canTransition("PROCESSING", "PENDING_REVIEW")).toBe(true);
  });

  it("blocks release until approved", () => {
    expect(canRelease("PENDING_REVIEW")).toBe(false);
    expect(canRelease("PROCESSING")).toBe(false);
    expect(canRelease("APPROVED")).toBe(true);
  });

  it("marks pending review as reviewable", () => {
    expect(isReviewable("PENDING_REVIEW")).toBe(true);
    expect(isReviewable("PROCESSING")).toBe(false);
  });

  it("allows discard rerun from pending review", () => {
    expect(canTransition("PENDING_REVIEW", "PROCESSING")).toBe(true);
  });

  it("throws on invalid transition", () => {
    expect(() => assertTransition("APPROVED", "PROCESSING")).toThrow();
  });
});
