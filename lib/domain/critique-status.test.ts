import { describe, expect, it } from "vitest";
import {
  canRelease,
  canTransition,
  deskAttentionCount,
  isReviewable,
  needsDeskAttention,
  pendingReviewCount,
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
    expect(isReviewable("ERROR")).toBe(false);
  });

  it("includes ERROR in the default desk-attention queue", () => {
    expect(needsDeskAttention("PENDING_REVIEW")).toBe(true);
    expect(needsDeskAttention("ERROR")).toBe(true);
    expect(needsDeskAttention("PROCESSING")).toBe(false);
    expect(needsDeskAttention("APPROVED")).toBe(false);
    expect(
      deskAttentionCount(["PENDING_REVIEW", "ERROR", "APPROVED", "PROCESSING"]),
    ).toBe(2);
  });

  it("counts only reviewable statuses for the badge and queue heading", () => {
    expect(
      pendingReviewCount(["PENDING_REVIEW", "APPROVED", "PENDING_REVIEW", "ERROR"]),
    ).toBe(2);
  });

  it("allows discard rerun from pending review", () => {
    expect(canTransition("PENDING_REVIEW", "PROCESSING")).toBe(true);
  });

  it("throws on invalid transition", () => {
    expect(() => assertTransition("APPROVED", "PROCESSING")).toThrow();
  });
});
