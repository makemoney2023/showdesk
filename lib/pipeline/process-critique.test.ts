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
      "Vorzüglicher Rüde mit kräftigen Knochen. Formwert V.",
    );
    expect(draft.formwert).toBe("V");
    expect(draft.narrative).toContain("Vorzüglicher Rüde");
    expect(draft.narrative).toContain("kräftigen Knochen");
  });
});

describe("ensureNarrativeFromTranscript", () => {
  it("seeds empty narrative from STT", () => {
    const draft = ensureNarrativeFromTranscript(
      createEmptyDraft(),
      "Live German ringside text.",
    );
    expect(draft.narrative).toBe("Live German ringside text.");
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
      live: "Live German text.",
      batch: "Batch text.",
      batchMock: false,
    });
    expect(merged.source).toBe("live");
    expect(merged.transcript).toBe("Live German text.");
  });
});
