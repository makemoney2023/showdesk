import { describe, expect, it } from "vitest";
import { CRITIQUE_STATUSES } from "./critique-status";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  labelDeliveryStatus,
  labelOffline,
  labelSeStatus,
} from "./status-labels";

describe("status-labels", () => {
  it("maps every critique status to a human label without leaking the enum", () => {
    const labels = [
      labelCritiqueStatus("none"),
      ...CRITIQUE_STATUSES.map((s) => labelCritiqueStatus(s)),
    ];
    expect(labels).toEqual([
      "Not started",
      "Processing",
      "Pending review",
      "Approved",
      "Needs attention",
    ]);
    for (const label of labels) {
      expect(label.includes("PENDING_REVIEW")).toBe(false);
      expect(label).not.toBe("none");
    }
  });

  it("maps SE statuses", () => {
    expect(labelSeStatus("draft")).toBe("Draft");
    expect(labelSeStatus("complete")).toBe("SE complete");
  });

  it("maps offline connectivity", () => {
    expect(labelOffline(true)).toBe("Synced");
    expect(labelOffline(false)).toBe("Offline — saved locally");
  });

  it("maps delivery statuses to human labels", () => {
    expect(labelDeliveryStatus("pending")).toBe("Pending");
    expect(labelDeliveryStatus("sent")).toBe("Sent");
    expect(labelDeliveryStatus("failed")).toBe("Failed");
    expect(labelDeliveryStatus("blocked")).toBe("Held");
  });

  it("assigns chip tones", () => {
    expect(critiqueChipTone("none")).toBe("muted");
    expect(critiqueChipTone("PROCESSING")).toBe("warning");
    expect(critiqueChipTone("PENDING_REVIEW")).toBe("pending");
    expect(critiqueChipTone("APPROVED")).toBe("success");
    expect(critiqueChipTone("ERROR")).toBe("error");
  });
});
