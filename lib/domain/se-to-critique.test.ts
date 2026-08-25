import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  canSyncSeIntoCritique,
  critiqueDraftFromSeForm,
  mergeSeIntoCritiqueDraft,
  SE_SYNC_NOTE,
  syncSeIntoCritiques,
  syncSeIntoDogCritiques,
} from "./se-to-critique";
import type { CritiqueRecord } from "@/lib/types";

function baseCritique(
  overrides: Partial<CritiqueRecord> = {},
): CritiqueRecord {
  return {
    id: "c1",
    show_id: "s1",
    entry_id: "e1",
    status: "PENDING_REVIEW",
    transcript: "",
    draft: {
      narrative: "",
      formwert: null,
      placement: null,
      titles: [],
      draftAssist: {},
    },
    delivery_status: "pending",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("se-to-critique", () => {
  it("builds narrative from SE appearance, comments, and result", () => {
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Strong male, good type.";
    form.comments = "Moves freely.";
    form.final_result = "pass";
    form.formwert = "V";
    form.head_shape = "strong_typey";
    const draft = critiqueDraftFromSeForm(form);
    expect(draft.narrative).toContain("Strong male");
    expect(draft.narrative).toContain("Moves freely");
    expect(draft.narrative).toContain("SE result: PASS");
    expect(draft.formwert).toBe("V");
    expect(draft.draftAssist?.note).toBe(SE_SYNC_NOTE);
  });

  it("merges SE section into an audio draft without wiping it", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "SE steward notes";
    form.final_result = "pass";
    const merged = mergeSeIntoCritiqueDraft(
      {
        narrative: "Judge audio narrative",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
      form,
    );
    expect(merged.narrative).toContain("Judge audio narrative");
    expect(merged.narrative).toContain("— SE form —");
    expect(merged.narrative).toContain("SE steward notes");
    expect(merged.formwert).toBe("V");
  });

  it("copies Formwert onto an existing audio draft even without SE notes", () => {
    const form = createEmptyTnrkSeForm();
    form.formwert = "Sg";
    const merged = mergeSeIntoCritiqueDraft(
      {
        narrative: "Judge audio narrative",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
      form,
    );
    expect(merged.narrative).toBe("Judge audio narrative");
    expect(merged.formwert).toBe("Sg");
  });

  it("creates a review draft from a rating-only SE save", () => {
    const form = createEmptyTnrkSeForm();
    form.formwert = "V";
    const next = syncSeIntoCritiques([], "s1", "e1", form, {
      force: false,
      newId: () => "c-rating",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.draft.formwert).toBe("V");
  });

  it("lets an SE Formwert override a prior audio rating", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "SE steward notes";
    form.formwert = "Sg";
    const merged = mergeSeIntoCritiqueDraft(
      {
        narrative: "Judge audio narrative",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
      form,
    );
    expect(merged.formwert).toBe("Sg");
  });

  it("blocks sync only after approve/release", () => {
    expect(canSyncSeIntoCritique(undefined)).toBe(true);
    expect(canSyncSeIntoCritique(baseCritique())).toBe(true);
    expect(
      canSyncSeIntoCritique(baseCritique({ status: "APPROVED" })),
    ).toBe(false);
  });

  it("creates a review draft from an SE form when the dog has no critique", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "Strong male, good type.";
    form.final_result = "pass";
    const next = syncSeIntoCritiques([], "s1", "e1", form, {
      force: false,
      newId: () => "c-se",
      now: "2026-08-22T12:00:00.000Z",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("c-se");
    expect(next[0]?.status).toBe("PENDING_REVIEW");
    expect(next[0]?.draft.narrative).toContain("Strong male");
  });

  it("does not spawn a second critique after the certificate is approved", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "Corrected bite note after approve.";
    form.final_result = "pass";
    const approved = baseCritique({
      status: "APPROVED",
      delivery_status: "pending",
      draft: {
        narrative: "Approved SE narrative",
        formwert: null,
        placement: null,
        titles: [],
        draftAssist: { note: SE_SYNC_NOTE },
      },
    });
    const next = syncSeIntoCritiques([approved], "s1", "e1", form, {
      force: true,
      newId: () => "c-duplicate",
    });
    expect(next).toEqual([approved]);
  });

  it("merges SE updates into a recalled pending critique", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "Updated after recall.";
    form.final_result = "pass";
    const recalled = baseCritique({
      status: "PENDING_REVIEW",
      draft: {
        narrative: "Approved then recalled",
        formwert: null,
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
    });
    const next = syncSeIntoCritiques([recalled], "s1", "e1", form, {
      force: false,
      newId: () => "unused",
      now: "2026-08-22T13:00:00.000Z",
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("c1");
    expect(next[0]?.draft.narrative).toContain("Approved then recalled");
    expect(next[0]?.draft.narrative).toContain("Updated after recall");
  });

  it("carries the SE verbal critique onto conformation siblings", () => {
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Strong working male.";
    form.final_result = "pass";
    const next = syncSeIntoDogCritiques(
      [],
      [
        { id: "se-1", show_id: "s1", dog_id: "dog-1", event_kind: "se" },
        {
          id: "sat-1",
          show_id: "s1",
          dog_id: "dog-1",
          event_kind: "conformation",
        },
      ],
      "s1",
      "se-1",
      form,
      { force: true, newId: () => `c-${Math.random()}`, now: "t" },
    );
    expect(next.map((critique) => critique.entry_id).sort()).toEqual([
      "sat-1",
      "se-1",
    ]);
    expect(next.every((critique) => critique.draft.narrative.includes("Strong working male"))).toBe(
      true,
    );
  });
});
