export type WebmFallbackReason = "pcm-closed" | "processor-idle" | "pcm-silent";

/**
 * Live PCM and WebM sockets must never run together — both would
 * transcribe the same speech into one accumulator.
 */
export function shouldOpenWebmFallback(input: {
  stopped: boolean;
  gotResult: boolean;
  webmStarted: boolean;
  pcmOpen: boolean;
  pcmChunksSent: number;
  reason: WebmFallbackReason;
}): boolean {
  if (input.stopped || input.gotResult || input.webmStarted) return false;
  if (input.reason === "pcm-closed") return true;
  if (input.reason === "processor-idle") {
    return !input.pcmOpen || input.pcmChunksSent === 0;
  }
  return input.pcmChunksSent > 0;
}
