import { describe, expect, it } from "vitest";
import { reviewPrimaryAction } from "./review-primary-action";

describe("reviewPrimaryAction", () => {
  it("approves pending review", () => {
    expect(reviewPrimaryAction("PENDING_REVIEW")).toEqual({
      label: "Approve & release",
      kind: "approve",
      disabled: false,
    });
  });

  it("disables processing", () => {
    expect(reviewPrimaryAction("PROCESSING")).toEqual({
      label: "Processing…",
      kind: "processing",
      disabled: true,
    });
  });

  it("retries errors", () => {
    expect(reviewPrimaryAction("ERROR")).toEqual({
      label: "Retry processing",
      kind: "retry",
      disabled: false,
    });
  });

  it("prints the approved certificate", () => {
    expect(reviewPrimaryAction("APPROVED")).toEqual({
      label: "Print certificate",
      kind: "print",
      disabled: false,
    });
  });
});
