import { describe, expect, it } from "vitest";
import { structureDraftFromTranscript } from "./process-critique";
import { mergeLiveAndBatchTranscript } from "@/lib/deepgram/transcript";

describe("structureDraftFromTranscript", () => {
  it("extracts formwert V from German praise", () => {
    const draft = structureDraftFromTranscript(
      "Vorzüglicher Rüde. Formwert V.",
    );
    expect(draft.formwert).toBe("V");
    expect(draft.narrative.length).toBeGreaterThan(0);
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
