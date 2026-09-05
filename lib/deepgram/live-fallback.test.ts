import { describe, expect, it } from "vitest";
import { shouldOpenWebmFallback } from "./live-fallback";

describe("shouldOpenWebmFallback", () => {
  const idle = {
    stopped: false,
    gotResult: false,
    webmStarted: false,
    pcmOpen: true,
    pcmChunksSent: 12,
  };

  it("never opens a second socket after live already has text", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        gotResult: true,
        reason: "processor-idle",
      }),
    ).toBe(false);
  });

  it("does not start webm while PCM is flowing", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        reason: "processor-idle",
      }),
    ).toBe(false);
  });

  it("starts webm when ScriptProcessor never fired", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        pcmChunksSent: 0,
        reason: "processor-idle",
      }),
    ).toBe(true);
  });

  it("starts webm only after PCM closes without results", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        pcmOpen: false,
        pcmChunksSent: 0,
        reason: "pcm-closed",
      }),
    ).toBe(true);
  });

  it("switches exclusively when PCM is sending but Deepgram stays silent", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        reason: "pcm-silent",
      }),
    ).toBe(true);
  });

  it("switches after a short wait when no words have arrived", () => {
    expect(
      shouldOpenWebmFallback({
        ...idle,
        pcmChunksSent: 0,
        reason: "no-results",
      }),
    ).toBe(true);
  });
});
