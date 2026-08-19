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

export function mergeLiveAndBatchTranscript(input: {
  live?: string | null;
  batch: string;
  batchMock: boolean;
}): { transcript: string; mock: boolean; source: TranscriptSource } {
  const live = input.live?.trim() ?? "";
  if (live) {
    return { transcript: live, mock: false, source: "live" };
  }
  if (input.batchMock) {
    return { transcript: input.batch, mock: true, source: "mock" };
  }
  return { transcript: input.batch, mock: false, source: "batch" };
}

export function deepgramListenUrl(opts: {
  model?: string;
  language?: string;
  interimResults?: boolean;
}): string {
  const params = new URLSearchParams({
    model: opts.model ?? "nova-3",
    language: opts.language ?? "de",
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
