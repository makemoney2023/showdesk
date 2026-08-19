import { describe, expect, it } from "vitest";
import {
  deepgramListenUrl,
  extractDeepgramTranscript,
  mergeLiveAndBatchTranscript,
} from "./transcript";

describe("extractDeepgramTranscript", () => {
  it("reads the top alternative from a prerecorded response", () => {
    const text = extractDeepgramTranscript({
      results: {
        channels: [
          {
            alternatives: [
              { transcript: "Vorzüglicher Rüde. Formwert V.", confidence: 0.9 },
              { transcript: "ignored", confidence: 0.1 },
            ],
          },
        ],
      },
    });
    expect(text).toBe("Vorzüglicher Rüde. Formwert V.");
  });

  it("returns empty string when channels are missing", () => {
    expect(extractDeepgramTranscript({})).toBe("");
    expect(extractDeepgramTranscript(null)).toBe("");
  });
});

describe("mergeLiveAndBatchTranscript", () => {
  it("prefers non-empty live transcript", () => {
    expect(
      mergeLiveAndBatchTranscript({
        live: " live text ",
        batch: "batch text",
        batchMock: false,
      }),
    ).toEqual({ transcript: "live text", mock: false, source: "live" });
  });

  it("falls back to batch when live is empty", () => {
    expect(
      mergeLiveAndBatchTranscript({
        live: "  ",
        batch: "batch text",
        batchMock: false,
      }),
    ).toEqual({ transcript: "batch text", mock: false, source: "batch" });
  });

  it("marks mock when both are empty/mock", () => {
    expect(
      mergeLiveAndBatchTranscript({
        live: "",
        batch: "mock",
        batchMock: true,
      }),
    ).toEqual({ transcript: "mock", mock: true, source: "mock" });
  });
});

describe("deepgramListenUrl", () => {
  it("builds an English nova-3 listen URL with interim results", () => {
    const url = deepgramListenUrl({
      model: "nova-3",
      language: "en-US",
      interimResults: true,
    });
    expect(url).toContain("wss://api.deepgram.com/v1/listen?");
    expect(url).toContain("model=nova-3");
    expect(url).toContain("language=en-US");
    expect(url).toContain("interim_results=true");
    expect(url).toContain("smart_format=true");
  });
});

describe("applyLiveResult", () => {
  it("appends finals and replaces interim for display", async () => {
    const { applyLiveResult } = await import("./transcript");
    let state = { finals: [] as string[], interim: "" };
    let next = applyLiveResult(state, {
      is_final: false,
      transcript: "Vorzüglicher",
    });
    expect(next.display).toBe("Vorzüglicher");
    state = { finals: next.finals, interim: next.interim };
    next = applyLiveResult(state, {
      is_final: true,
      transcript: "Vorzüglicher Rüde.",
    });
    expect(next.finals).toEqual(["Vorzüglicher Rüde."]);
    expect(next.interim).toBe("");
    expect(next.display).toBe("Vorzüglicher Rüde.");
  });
});
