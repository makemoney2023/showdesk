import { describe, expect, it } from "vitest";
import {
  buildReviewQueueRows,
  nextReviewItemId,
  reviewQueueMatchesSearch,
  reviewPdfPreviewActions,
  tnrkCritiquePdfHref,
  tnrkCritiquePdfLabel,
  tnrkSePdfHref,
  tnrkSePdfLabel,
} from "./review-queue-layout";

describe("nextReviewItemId", () => {
  it("moves forward, then falls back to the previous item", () => {
    expect(nextReviewItemId(["a", "b", "c"], "b")).toBe("c");
    expect(nextReviewItemId(["a", "b", "c"], "c")).toBe("b");
    expect(nextReviewItemId(["a"], "a")).toBeNull();
  });

  it("selects the first item when the current item is absent", () => {
    expect(nextReviewItemId(["a", "b"], "missing")).toBe("a");
    expect(nextReviewItemId([], "missing")).toBeNull();
  });
});

describe("reviewQueueMatchesSearch", () => {
  const critique = { judge: "Judge Müller", status: "PENDING_REVIEW" };
  const entry = {
    dog_name: "Rex vom Test",
    armband: "101",
    owner: "Jane Doe",
  };

  it("searches dog, armband, owner, judge, and status", () => {
    expect(reviewQueueMatchesSearch("rex", critique, entry)).toBe(true);
    expect(reviewQueueMatchesSearch("101", critique, entry)).toBe(true);
    expect(reviewQueueMatchesSearch("jane", critique, entry)).toBe(true);
    expect(reviewQueueMatchesSearch("müller", critique, entry)).toBe(true);
    expect(reviewQueueMatchesSearch("pending", critique, entry)).toBe(true);
    expect(reviewQueueMatchesSearch("missing", critique, entry)).toBe(false);
  });
});

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

describe("SE PDF preview affordance", () => {
  it("exposes a prominent SE preview label and evaluation PDF href", () => {
    expect(tnrkSePdfLabel()).toBe("SE PDF Preview");
    expect(tnrkSePdfHref("show-1", "eval-3")).toBe(
      "/api/pdf/tnrk?kind=se&show_id=show-1&evaluation_id=eval-3",
    );
  });

  it("includes SE preview in review actions when an SE form exists", () => {
    expect(
      reviewPdfPreviewActions({
        showId: "show-1",
        critiqueId: "crit-9",
        seEvaluationId: "eval-3",
      }),
    ).toEqual([
      {
        kind: "critique",
        label: "TNRK PDF Preview",
        href: "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9",
      },
      {
        kind: "se",
        label: "SE PDF Preview",
        href: "/api/pdf/tnrk?kind=se&show_id=show-1&evaluation_id=eval-3",
      },
    ]);
  });

  it("omits SE preview when no SE form is linked", () => {
    expect(
      reviewPdfPreviewActions({
        showId: "show-1",
        critiqueId: "crit-9",
        seEvaluationId: null,
      }),
    ).toEqual([
      {
        kind: "critique",
        label: "TNRK PDF Preview",
        href: "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9",
      },
    ]);
  });
});
