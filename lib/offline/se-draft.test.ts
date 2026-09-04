import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import {
  seFormFingerprint,
  shouldRestoreSeDraft,
  type RecoverableSeDraft,
} from "./se-draft";
import type { SeEvaluationRecord } from "@/lib/types";

function evaluation(): SeEvaluationRecord {
  return {
    id: "eval-1",
    show_id: "show-1",
    entry_id: "entry-1",
    form: createEmptyTnrkSeForm(),
    status: "draft",
    created_at: "2026-08-21T10:00:00.000Z",
    updated_at: "2026-08-21T10:05:00.000Z",
  };
}

function localDraft(): RecoverableSeDraft {
  return {
    showId: "show-1",
    entryId: "entry-1",
    evaluationId: "eval-1",
    form: { ...createEmptyTnrkSeForm(), comments: "Recovered note" },
    savedAt: "2026-08-21T10:06:00.000Z",
    serverUpdatedAt: "2026-08-21T10:05:00.000Z",
  };
}

describe("recoverable SE drafts", () => {
  it("restores only a newer draft for the same evaluation", () => {
    expect(shouldRestoreSeDraft(localDraft(), evaluation())).toBe(true);
    expect(
      shouldRestoreSeDraft(
        { ...localDraft(), savedAt: "2026-08-21T10:04:00.000Z" },
        evaluation(),
      ),
    ).toBe(false);
    expect(
      shouldRestoreSeDraft(
        { ...localDraft(), evaluationId: "another-evaluation" },
        evaluation(),
      ),
    ).toBe(false);
    expect(
      shouldRestoreSeDraft(
        { ...localDraft(), entryId: "entry-other" },
        evaluation(),
      ),
    ).toBe(false);
  });

  it("fingerprints nested measurement changes", () => {
    const form = createEmptyTnrkSeForm();
    const changed = {
      ...form,
      measurements: { ...form.measurements, height: "62 cm" },
    };
    expect(seFormFingerprint(changed)).not.toBe(seFormFingerprint(form));
  });
});
