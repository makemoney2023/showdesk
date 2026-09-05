import { describe, expect, it } from "vitest";
import { sniffAudioContentType } from "./client";
import {
  deepgramListenUrl,
  extractDeepgramTranscript,
  mergeLiveAndBatchTranscript,
} from "./transcript";

describe("sniffAudioContentType", () => {
  it("detects RIFF WAVE", () => {
    const wav = new Uint8Array(12);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8);
    expect(sniffAudioContentType(wav)).toBe("audio/wav");
  });

  it("detects EBML WebM", () => {
    expect(sniffAudioContentType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe(
      "audio/webm",
    );
  });

  it("detects MP4 ftyp", () => {
    const mp4 = new Uint8Array(12);
    mp4.set([0x66, 0x74, 0x79, 0x70], 4);
    expect(sniffAudioContentType(mp4)).toBe("audio/mp4");
  });
});

describe("extractDeepgramTranscript", () => {
  it("reads the top alternative from a prerecorded response", () => {
    const text = extractDeepgramTranscript({
      results: {
        channels: [
          {
            alternatives: [
              { transcript: "Excellent male. Rating V.", confidence: 0.9 },
              { transcript: "ignored", confidence: 0.1 },
            ],
          },
        ],
      },
    });
    expect(text).toBe("Excellent male. Rating V.");
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

  it("prefers a complete batch take over a live fragment", () => {
    expect(
      mergeLiveAndBatchTranscript({
        live: "excellent gait",
        batch:
          "Large male, strong bones, excellent gait, correct croup, and a firm back. Rating very good.",
        batchMock: false,
      }),
    ).toEqual({
      transcript:
        "Large male, strong bones, excellent gait, correct croup, and a firm back. Rating very good.",
      mock: false,
      source: "batch",
    });
  });

  it("keeps live when batch is only a mock filler", () => {
    expect(
      mergeLiveAndBatchTranscript({
        live: "excellent gait",
        batch: "Armband one oh one. Excellent male.",
        batchMock: true,
      }),
    ).toEqual({ transcript: "excellent gait", mock: false, source: "live" });
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
      transcript: "Excellent",
    });
    expect(next.display).toBe("Excellent");
    state = { finals: next.finals, interim: next.interim };
    next = applyLiveResult(state, {
      is_final: true,
      transcript: "Excellent male.",
    });
    expect(next.finals).toEqual(["Excellent male."]);
    expect(next.interim).toBe("");
    expect(next.display).toBe("Excellent male.");
  });

  it("does not append the same final twice", async () => {
    const { applyLiveResult } = await import("./transcript");
    const once = applyLiveResult(
      { finals: ["Excellent male."], interim: "" },
      { is_final: true, transcript: "Excellent male." },
    );
    expect(once.finals).toEqual(["Excellent male."]);
  });
});
