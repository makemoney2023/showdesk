import { describe, expect, it } from "vitest";
import {
  ensureNarrativeFromTranscript,
  structureDraftFromTranscript,
} from "./process-critique";
import { mergeLiveAndBatchTranscript } from "@/lib/deepgram/transcript";
import { createEmptyDraft } from "@/lib/domain/adrk-template";

describe("structureDraftFromTranscript", () => {
  it("puts transcription into narrative for editing", () => {
    const draft = structureDraftFromTranscript(
      "Excellent male with strong bone. Rating V.",
    );
    expect(draft.formwert).toBe("V");
    expect(draft.narrative).toContain("Excellent male");
    expect(draft.narrative).toContain("strong bone");
  });

  it("still maps German rating words when present", () => {
    const draft = structureDraftFromTranscript(
      "Vorzüglicher Rüde. Formwert V.",
    );
    expect(draft.formwert).toBe("V");
  });
});

describe("ensureNarrativeFromTranscript", () => {
  it("seeds empty narrative from STT", () => {
    const draft = ensureNarrativeFromTranscript(
      createEmptyDraft(),
      "Live English ringside text.",
    );
    expect(draft.narrative).toBe("Live English ringside text.");
  });

  it("does not overwrite an existing narrative", () => {
    const existing = createEmptyDraft();
    existing.narrative = "Secretary edit";
    const draft = ensureNarrativeFromTranscript(
      existing,
      "Fresh transcript",
    );
    expect(draft.narrative).toBe("Secretary edit");
  });
});

describe("processCritique transcript preference", () => {
  it("prefers live over batch via merge helper", () => {
    const merged = mergeLiveAndBatchTranscript({
      live: "Live English text.",
      batch: "Batch text.",
      batchMock: false,
    });
    expect(merged.source).toBe("live");
    expect(merged.transcript).toBe("Live English text.");
  });
});
