import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  canSyncSeIntoCritique,
  critiqueDraftFromSeForm,
  critiqueLetterForCertificate,
  mergeSeIntoCritiqueDraft,
  SE_SYNC_NOTE,
  seEvaluationForEntry,
  syncSeIntoCritiques,
  syncSeIntoDogCritiques,
  visibleReviewCritiques,
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

  it("creates one review draft for the SE appearance, not conformation clones", () => {
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Imported roster dog.";
    form.final_result = "pass";
    const next = syncSeIntoDogCritiques(
      [],
      [
        {
          id: "se-1",
          show_id: "s1",
          zb_number: "AKC-1",
          event_kind: "se",
        },
        {
          id: "sat-1",
          show_id: "s1",
          zb_number: "akc-1",
          event_kind: "conformation",
        },
        {
          id: "sun-1",
          show_id: "s1",
          zb_number: "akc-1",
          event_kind: "conformation",
        },
      ],
      "s1",
      "se-1",
      form,
      { force: true, newId: () => `c-${Math.random()}`, now: "t" },
    );
    expect(next.map((critique) => critique.entry_id)).toEqual(["se-1"]);
  });

  it("merges SE notes into an existing conformation critique only", () => {
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Strong working male.";
    form.final_result = "pass";
    const saturday = baseCritique({
      id: "c-sat",
      entry_id: "sat-1",
      transcript: "Judge audio narrative",
      draft: {
        narrative: "Judge audio narrative",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
    });
    const next = syncSeIntoDogCritiques(
      [saturday],
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
      { force: true, newId: () => "c-se", now: "t" },
    );
    expect(next.map((critique) => critique.entry_id).sort()).toEqual([
      "sat-1",
      "se-1",
    ]);
    const sat = next.find((critique) => critique.entry_id === "sat-1");
    expect(sat?.draft.narrative).toContain("Judge audio narrative");
    expect(sat?.draft.narrative).toContain("Strong working male");
  });

  it("drops unused Saturday/Sunday SE clones on the next SE save", () => {
    const form = createEmptyTnrkSeForm();
    form.comments = "Keep one review row.";
    form.final_result = "pass";
    const clone = baseCritique({
      id: "c-sat-clone",
      entry_id: "sat-1",
      transcript: "Ringside SE form",
      draft: {
        narrative: "Old clone",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: SE_SYNC_NOTE },
      },
    });
    const next = syncSeIntoDogCritiques(
      [clone],
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
      { force: true, newId: () => "c-se", now: "t" },
    );
    expect(next.map((critique) => critique.entry_id)).toEqual(["se-1"]);
  });

  it("hides unused SE clones from the review queue when the SE row exists", () => {
    const se = baseCritique({
      id: "c-se",
      entry_id: "se-1",
      transcript: "Ringside SE form",
      draft: {
        narrative: "SE notes",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: SE_SYNC_NOTE },
      },
    });
    const clone = baseCritique({
      id: "c-sat",
      entry_id: "sat-1",
      transcript: "Ringside SE form",
      draft: se.draft,
    });
    const audio = baseCritique({
      id: "c-sun",
      entry_id: "sun-1",
      transcript: "Judge audio",
      audio_path: "show/c-sun.webm",
    });
    const entries = [
      { id: "se-1", show_id: "s1", dog_id: "dog-1", event_kind: "se" as const },
      {
        id: "sat-1",
        show_id: "s1",
        dog_id: "dog-1",
        event_kind: "conformation" as const,
      },
      {
        id: "sun-1",
        show_id: "s1",
        dog_id: "dog-1",
        event_kind: "conformation" as const,
      },
    ];
    expect(
      visibleReviewCritiques([se, clone, audio], entries).map((item) => item.id),
    ).toEqual(["c-se", "c-sun"]);
  });

  it("finds the SE evaluation from a conformation sibling", () => {
    const entries = [
      { id: "se-1", show_id: "s1", dog_id: "dog-1" },
      { id: "sat-1", show_id: "s1", dog_id: "dog-1" },
    ];
    expect(
      seEvaluationForEntry(
        [{ entry_id: "se-1", status: "complete" as const }],
        entries,
        entries[1],
      )?.entry_id,
    ).toBe("se-1");
  });

  it("prefers a filled SE-entry form over an empty conformation sibling", () => {
    const empty = createEmptyTnrkSeForm();
    const filled = {
      ...createEmptyTnrkSeForm(),
      measurements: { ...empty.measurements, height: "67cm", weight: "53kg" },
      overall_appearance: "Very large male, strong bones.",
    };
    const entries = [
      { id: "entry-016", show_id: "s1", dog_id: "dog-1", event_kind: "conformation" as const },
      { id: "entry-038-se", show_id: "s1", dog_id: "dog-1", event_kind: "se" as const },
    ];
    const evaluations = [
      {
        entry_id: "entry-016",
        form: empty,
        status: "draft" as const,
        updated_at: "2026-08-21T00:00:00.000Z",
      },
      {
        entry_id: "entry-038-se",
        form: filled,
        status: "draft" as const,
        updated_at: "2026-09-04T20:27:00.000Z",
      },
    ];
    expect(
      seEvaluationForEntry(evaluations, entries, entries[0])?.entry_id,
    ).toBe("entry-038-se");
    expect(
      seEvaluationForEntry(evaluations, entries, entries[1])?.entry_id,
    ).toBe("entry-038-se");
  });

  it("keeps SE letter off the critique certificate", () => {
    const seOnly = baseCritique({
      transcript: "Ringside SE form",
      draft: critiqueDraftFromSeForm({
        ...createEmptyTnrkSeForm(),
        overall_appearance: "Strong male, good type.",
        comments: "Moves freely.",
        final_result: "pass",
      }),
    });
    expect(critiqueLetterForCertificate(seOnly)).toBe("");

    const spokenOverSe = baseCritique({
      transcript: "Medium size, excellent gait.",
      draft: seOnly.draft,
    });
    expect(critiqueLetterForCertificate(spokenOverSe)).toBe(
      "Medium size, excellent gait.",
    );

    const merged = mergeSeIntoCritiqueDraft(
      {
        narrative: "Judge audio narrative",
        formwert: "V",
        placement: null,
        titles: [],
        draftAssist: { note: "Draft assist only" },
      },
      {
        ...createEmptyTnrkSeForm(),
        comments: "SE steward notes",
        final_result: "pass",
      },
    );
    expect(
      critiqueLetterForCertificate({
        transcript: "Raw STT",
        draft: merged,
      }),
    ).toBe("Judge audio narrative");
  });
});
