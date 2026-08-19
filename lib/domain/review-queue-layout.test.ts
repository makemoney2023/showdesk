import { describe, expect, it } from "vitest";
import {
  buildReviewQueueRows,
  tnrkCritiquePdfHref,
  tnrkCritiquePdfLabel,
} from "./review-queue-layout";

describe("buildReviewQueueRows", () => {
  it("places the editor row directly after the selected dog", () => {
    expect(buildReviewQueueRows(["a", "b", "c"], "b")).toEqual([
      { kind: "critique", critiqueId: "a" },
      { kind: "critique", critiqueId: "b" },
      { kind: "editor", critiqueId: "b" },
      { kind: "critique", critiqueId: "c" },
    ]);
  });

  it("omits the editor when nothing is selected", () => {
    expect(buildReviewQueueRows(["a", "b"], null)).toEqual([
      { kind: "critique", critiqueId: "a" },
      { kind: "critique", critiqueId: "b" },
    ]);
  });

  it("omits the editor when selection is not in the queue", () => {
    expect(buildReviewQueueRows(["a", "b"], "missing")).toEqual([
      { kind: "critique", critiqueId: "a" },
      { kind: "critique", critiqueId: "b" },
    ]);
  });
});

describe("TNRK PDF preview affordance", () => {
  it("exposes a prominent preview label and critique PDF href", () => {
    expect(tnrkCritiquePdfLabel()).toBe("TNRK PDF Preview");
    expect(tnrkCritiquePdfHref("show-1", "crit-9")).toBe(
      "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9",
    );
  });
});
