"use client";

import { applyLiveResult } from "@/lib/deepgram/transcript";

export type LiveSession = {
  attachAudio: (opts: {
    stream: MediaStream;
    audioContext: AudioContext;
  }) => Promise<void>;
  feedWebmChunk: (chunk: Blob) => void;
  stop: () => Promise<string>;
};

function downsampleTo16k(float32: Float32Array, inputRate: number): Int16Array {
  if (inputRate === 16000) {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]!));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputRate / 16000;
  const newLen = Math.max(1, Math.floor(float32.length / ratio));
  const out = new Int16Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = Math.min(float32.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, float32[idx]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function pcmChunkToArrayBuffer(pcm: Int16Array): ArrayBuffer {
  return pcm.buffer.slice(
    pcm.byteOffset,
    pcm.byteOffset + pcm.byteLength,
  ) as ArrayBuffer;
}

/** Shared live listen query — English-only ringside STT. */
export function deepgramLiveQuery(opts: {
  encoding?: "linear16";
  sampleRate?: number;
}): Record<string, string> {
  const q: Record<string, string> = {
    model: "nova-3",
    language: "en-US",
    smart_format: "true",
    punctuate: "true",
    interim_results: "true",
    // ms of silence before speech_final — default is too twitchy for ringside.
    endpointing: "300",
    utterance_end_ms: "1200",
    vad_events: "true",
  };
  if (opts.encoding) {
    q.encoding = opts.encoding;
    q.sample_rate = String(opts.sampleRate ?? 16000);
    q.channels = "1";
  }
  return q;
}

function openDeepgramSocket(
  accessToken: string,
  query: Record<string, string>,
): WebSocket {
  const params = new URLSearchParams(query);
  const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  const ws = new WebSocket(url, ["bearer", accessToken]);
  ws.binaryType = "arraybuffer";
  return ws;
}

async function waitForOpen(ws: WebSocket, label: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timeout`));
    }, 10000);
    let settled = false;
    ws.onopen = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    ws.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error(`${label} error`));
    };
    ws.onclose = (ev) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(
        new Error(
          `${label} closed (${ev.code}${ev.reason ? `: ${ev.reason}` : ""})`,
        ),
      );
    };
  });
}

async function grantAccessToken(): Promise<string | null> {
  const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  return access_token || null;
}

/**
 * Browser live STT via temporary Deepgram JWT.
 * Keeps the AudioContext alive with a silent oscillator (does NOT route mic
 * to speakers — that triggers browser AEC and mutes the mic after a moment).
 */
export async function startDeepgramLiveSession(opts: {
  onDisplay: (text: string) => void;
  onStatus?: (status: string) => void;
}): Promise<LiveSession | null> {
  const accessToken = await grantAccessToken();
  if (!accessToken) {
    opts.onStatus?.("Live STT unavailable — token grant failed");
    return null;
  }

  const pcmWs = openDeepgramSocket(
    accessToken,
    deepgramLiveQuery({ encoding: "linear16", sampleRate: 16000 }),
  );

  try {
    await waitForOpen(pcmWs, "Deepgram PCM socket");
  } catch (err) {
    try {
      pcmWs.close();
    } catch {
      /* ignore */
    }
    const msg = err instanceof Error ? err.message : "connect failed";
    opts.onStatus?.(`Live STT failed — ${msg}`);
    return null;
  }

  opts.onStatus?.("Live transcription connected");

  let state = { finals: [] as string[], interim: "" };
  let stopped = false;
  let gotResult = false;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processorSink: MediaStreamAudioDestinationNode | null = null;
  let keepAliveOsc: OscillatorNode | null = null;
  let keepAliveGain: GainNode | null = null;
  let keepAliveId: number | null = null;
  let webmWs: WebSocket | null = null;
  let webmStarted = false;
  const webmQueue: Blob[] = [];

  const handleMessage = (event: MessageEvent) => {
    try {
      const raw =
        typeof event.data === "string"
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer);
      const msg = JSON.parse(raw) as {
        type?: string;
        is_final?: boolean;
        speech_final?: boolean;
        channel?: { alternatives?: Array<{ transcript?: string }> };
      };
      if (msg.type === "Error") {
        opts.onStatus?.(`Live STT error — ${raw.slice(0, 120)}`);
        return;
      }
      if (msg.type !== "Results") return;
      const transcript = msg.channel?.alternatives?.[0]?.transcript ?? "";
      if (!transcript.trim()) return;
      gotResult = true;
      const next = applyLiveResult(state, {
        is_final: Boolean(msg.is_final || msg.speech_final),
        transcript,
      });
      state = { finals: next.finals, interim: next.interim };
      opts.onDisplay(next.display);
    } catch {
      /* ignore */
    }
  };

  pcmWs.onmessage = handleMessage;
  pcmWs.onclose = () => {
    // Do not kill the whole session — fall back to webm if still recording.
    if (!stopped && !gotResult) {
      opts.onStatus?.("PCM socket closed — trying webm…");
      void ensureWebmSocket();
    } else if (!stopped) {
      opts.onStatus?.("PCM socket closed — webm fallback if needed");
      void ensureWebmSocket();
    }
  };

  keepAliveId = window.setInterval(() => {
    if (pcmWs.readyState === WebSocket.OPEN) {
      pcmWs.send(JSON.stringify({ type: "KeepAlive" }));
    }
    if (webmWs?.readyState === WebSocket.OPEN) {
      webmWs.send(JSON.stringify({ type: "KeepAlive" }));
    }
  }, 5000);

  async function ensureWebmSocket() {
    if (webmStarted || stopped) return;
    webmStarted = true;
    try {
      const token = await grantAccessToken();
      if (!token) return;
      const ws = openDeepgramSocket(token, deepgramLiveQuery({}));
      await waitForOpen(ws, "Deepgram webm socket");
      webmWs = ws;
      ws.onmessage = handleMessage;
      opts.onStatus?.("Live transcription (webm)");
      while (webmQueue.length > 0 && webmWs.readyState === WebSocket.OPEN) {
        const blob = webmQueue.shift();
        if (!blob) break;
        const buf = await blob.arrayBuffer();
        if (webmWs.readyState === WebSocket.OPEN) webmWs.send(buf);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    async attachAudio({ stream, audioContext }) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Keep the audio graph running WITHOUT routing mic to speakers.
      // Mic→destination (even gain 0) can trip browser AEC and mute the track.
      keepAliveOsc = audioContext.createOscillator();
      keepAliveGain = audioContext.createGain();
      keepAliveGain.gain.value = 0;
      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(audioContext.destination);
      keepAliveOsc.start();

      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorSink = audioContext.createMediaStreamDestination();

      let sentChunks = 0;
      processor.onaudioprocess = (e) => {
        if (stopped) return;
        if (pcmWs.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = downsampleTo16k(input, audioContext.sampleRate);
        pcmWs.send(pcmChunkToArrayBuffer(pcm));
        sentChunks += 1;
        if (sentChunks === 1) {
          opts.onStatus?.("Live transcription listening…");
        }
      };

      source.connect(processor);
      processor.connect(processorSink);

      window.setTimeout(() => {
        if (!gotResult && !stopped) void ensureWebmSocket();
      }, 3000);
    },

    feedWebmChunk(chunk: Blob) {
      if (stopped || chunk.size === 0) return;
      if (webmWs?.readyState === WebSocket.OPEN) {
        void chunk.arrayBuffer().then((buf) => {
          if (webmWs?.readyState === WebSocket.OPEN) webmWs.send(buf);
        });
        return;
      }
      webmQueue.push(chunk);
      if (webmQueue.length > 40) webmQueue.shift();
      if (webmStarted) void ensureWebmSocket();
    },

    async stop() {
      stopped = true;
      if (keepAliveId != null) {
        window.clearInterval(keepAliveId);
        keepAliveId = null;
      }
      try {
        keepAliveOsc?.stop();
        keepAliveOsc?.disconnect();
        keepAliveGain?.disconnect();
        processor?.disconnect();
        source?.disconnect();
        processorSink?.disconnect();
      } catch {
        /* ignore */
      }
      keepAliveOsc = null;
      keepAliveGain = null;
      processor = null;
      source = null;
      processorSink = null;

      const finalize = async (ws: WebSocket | null) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: "Finalize" }));
        await new Promise((r) => setTimeout(r, 600));
        ws.send(JSON.stringify({ type: "CloseStream" }));
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
      await finalize(pcmWs);
      await finalize(webmWs);
      return state.finals.join(" ").trim() || state.interim.trim();
    },
  };
}
