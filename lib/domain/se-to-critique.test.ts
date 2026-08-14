import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  canSyncSeIntoCritique,
  critiqueDraftFromSeForm,
  mergeSeIntoCritiqueDraft,
  SE_SYNC_NOTE,
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
    form.head_shape = "strong_typey";
    const draft = critiqueDraftFromSeForm(form);
    expect(draft.narrative).toContain("Strong male");
    expect(draft.narrative).toContain("Moves freely");
    expect(draft.narrative).toContain("SE result: PASS");
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

  it("blocks sync only after approve/release", () => {
    expect(canSyncSeIntoCritique(undefined)).toBe(true);
    expect(canSyncSeIntoCritique(baseCritique())).toBe(true);
    expect(
      canSyncSeIntoCritique(baseCritique({ status: "APPROVED" })),
    ).toBe(false);
  });
});
