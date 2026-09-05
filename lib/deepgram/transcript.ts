export type DeepgramPrerecordedResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }>;
  };
};

export type TranscriptSource = "live" | "batch" | "mock";

export function extractDeepgramTranscript(
  payload: DeepgramPrerecordedResponse | null | undefined,
): string {
  const text =
    payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return text.trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Live STT can finalize only a fragment (socket drop, 600ms close).
 * Prefer the batch take when it is clearly the fuller recording.
 */
export function batchTranscriptIsFuller(live: string, batch: string): boolean {
  if (!live || !batch) return false;
  const liveWords = wordCount(live);
  const batchWords = wordCount(batch);
  if (batchWords >= Math.max(8, liveWords * 2) && batchWords - liveWords >= 6) {
    return true;
  }
  const liveLower = live.toLowerCase();
  const batchLower = batch.toLowerCase();
  return batchLower.includes(liveLower) && batchWords > liveWords + 3;
}

export function mergeLiveAndBatchTranscript(input: {
  live?: string | null;
  batch: string;
  batchMock: boolean;
}): { transcript: string; mock: boolean; source: TranscriptSource } {
  const live = input.live?.trim() ?? "";
  const batch = input.batch.trim();
  if (live && !input.batchMock && batchTranscriptIsFuller(live, batch)) {
    return { transcript: batch, mock: false, source: "batch" };
  }
  if (live) {
    return { transcript: live, mock: false, source: "live" };
  }
  if (input.batchMock) {
    return { transcript: batch, mock: true, source: "mock" };
  }
  return { transcript: batch, mock: false, source: "batch" };
}

export function deepgramListenUrl(opts: {
  model?: string;
  language?: string;
  interimResults?: boolean;
}): string {
  const params = new URLSearchParams({
    model: opts.model ?? "nova-3",
    language: opts.language ?? "en-US",
    smart_format: "true",
    punctuate: "true",
    interim_results: opts.interimResults === false ? "false" : "true",
  });
  return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
}

/** Accumulate finals; replace trailing interim for UI display. */
export function applyLiveResult(
  state: { finals: string[]; interim: string },
  result: { is_final?: boolean; transcript?: string },
): { finals: string[]; interim: string; display: string } {
  const piece = (result.transcript ?? "").trim();
  if (!piece) {
    const display = [...state.finals, state.interim].filter(Boolean).join(" ");
    return { ...state, display };
  }
  if (result.is_final) {
    if (state.finals[state.finals.length - 1] === piece) {
      return {
        finals: state.finals,
        interim: "",
        display: state.finals.join(" "),
      };
    }
    const finals = [...state.finals, piece];
    return {
      finals,
      interim: "",
      display: finals.join(" "),
    };
  }
  return {
    finals: state.finals,
    interim: piece,
    display: [...state.finals, piece].join(" "),
  };
}
