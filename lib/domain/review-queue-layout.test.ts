import { describe, expect, it } from "vitest";
import {
  buildReviewQueueRows,
  critiqueFromQueuedRecording,
  isQueuedCritiqueId,
  mergeQueuedRecordingsIntoReview,
  nextReviewItemId,
  queuedCritiqueId,
  reviewFocusHref,
  reviewQueueMatchesSearch,
  reviewDogHeading,
  reviewPdfPreviewActions,
  reviewTranscriptPreview,
  tnrkCritiquePdfHref,
  tnrkCritiquePdfLabel,
  tnrkSePdfHref,
  tnrkSePdfLabel,
} from "./review-queue-layout";

describe("reviewDogHeading", () => {
  it("puts the armband in front of the dog name", () => {
    expect(
      reviewDogHeading({ armband: 8, dog_name: "Aka Azure" }),
    ).toBe("#8  Aka Azure");
    expect(
      reviewDogHeading({ armband: "12", dog_name: "  Kylan  " }),
    ).toBe("#12  Kylan");
  });
});

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

  it("searches spoken transcript and letter narrative", () => {
    expect(
      reviewQueueMatchesSearch(
        "correct shoulder",
        {
          ...critique,
          transcript: "Medium sized male. Correct shoulder.",
        },
        entry,
      ),
    ).toBe(true);
    expect(
      reviewQueueMatchesSearch(
        "typey head",
        {
          ...critique,
          transcript: "Ringside SE form",
          draft: { narrative: "Typey head. Free movement." },
        },
        entry,
      ),
    ).toBe(true);
  });
});

describe("reviewTranscriptPreview", () => {
  it("prefers the spoken transcript over SE narrative", () => {
    expect(
      reviewTranscriptPreview({
        transcript: "Medium sized male. Correct shoulder.",
        draft: { narrative: "SE comments should not win" },
      }),
    ).toEqual({
      text: "Medium sized male. Correct shoulder.",
      empty: false,
    });
  });

  it("uses the letter when the transcript is an SE stub", () => {
    expect(
      reviewTranscriptPreview({
        transcript: "Ringside SE form",
        draft: {
          narrative: "large female, very good bone\n\n— SE form —\nhead notes",
        },
      }),
    ).toEqual({
      text: "large female, very good bone",
      empty: false,
    });
  });

  it("flags empty audio takes so the queue shows the missing letter", () => {
    expect(
      reviewTranscriptPreview({
        transcript: "",
        draft: { narrative: "" },
        audio_path: "show/crit.webm",
      }),
    ).toEqual({
      text: "No speech was transcribed",
      empty: true,
    });
  });
});

describe("queued critique review rows", () => {
  it("builds a pending review item from a queued recording", () => {
    const critique = critiqueFromQueuedRecording({
      id: "offline-1",
      entryId: "entry-1",
      showId: "show-1",
      createdAt: "2026-09-06T16:00:00.000Z",
      liveTranscript: "Strong male, good movement.",
      judge: "Hamid",
    });
    expect(critique.id).toBe(queuedCritiqueId("offline-1"));
    expect(isQueuedCritiqueId(critique.id)).toBe(true);
    expect(critique.status).toBe("PENDING_REVIEW");
    expect(critique.transcript).toBe("Strong male, good movement.");
    expect(critique.draft.narrative).toBe("Strong male, good movement.");
    expect(reviewFocusHref("entry-1")).toBe("/admin/review?entry=entry-1");
  });

  it("keeps queued recordings that are not already on the desk", () => {
    const desk = [
      {
        id: "crit-1",
        show_id: "show-1",
        entry_id: "entry-desk",
        status: "PENDING_REVIEW" as const,
        transcript: "Desk letter",
        draft: {
          narrative: "Desk letter",
          formwert: null,
          placement: null,
          titles: [],
        },
        delivery_status: "pending" as const,
        created_at: "2026-09-06T15:00:00.000Z",
        updated_at: "2026-09-06T15:00:00.000Z",
      },
    ];
    const merged = mergeQueuedRecordingsIntoReview(
      desk,
      [
        {
          id: "offline-new",
          entryId: "entry-queued",
          showId: "show-1",
          createdAt: "2026-09-06T16:00:00.000Z",
          liveTranscript: "Queued letter",
        },
        {
          id: "offline-dup",
          entryId: "entry-desk",
          showId: "show-1",
          createdAt: "2026-09-06T16:01:00.000Z",
          liveTranscript: "Should hide",
        },
      ],
      "show-1",
    );
    expect(merged.map((item) => item.entry_id)).toEqual([
      "entry-queued",
      "entry-desk",
    ]);
    expect(merged[0]?.transcript).toBe("Queued letter");
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
    expect(tnrkCritiquePdfHref("show-1", "crit-9", { preview: true })).toBe(
      "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9&preview=1",
    );
  });
});

describe("SE PDF preview affordance", () => {
  it("exposes a prominent SE preview label and evaluation PDF href", () => {
    expect(tnrkSePdfLabel()).toBe("SE PDF Preview");
    expect(tnrkSePdfHref("show-1", "eval-3")).toBe(
      "/api/pdf/tnrk?kind=se&show_id=show-1&evaluation_id=eval-3",
    );
    expect(
      tnrkSePdfHref("show-1", "eval-3", {
        preview: true,
        cacheBust: "2026-09-04T12:00:00.000Z",
      }),
    ).toBe(
      "/api/pdf/tnrk?kind=se&show_id=show-1&evaluation_id=eval-3&preview=1&overlay=3&v=2026-09-04T12%3A00%3A00.000Z",
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
        href: "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9&preview=1",
      },
      {
        kind: "se",
        label: "SE PDF Preview",
        href: "/api/pdf/tnrk?kind=se&show_id=show-1&evaluation_id=eval-3&preview=1&overlay=3",
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
        href: "/api/pdf/tnrk?kind=critique&show_id=show-1&critique_id=crit-9&preview=1",
      },
    ]);
  });
});
