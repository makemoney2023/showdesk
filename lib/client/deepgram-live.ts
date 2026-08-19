"use client";

import { applyLiveResult } from "@/lib/deepgram/transcript";

export type LiveSession = {
  /** Tap mic PCM from an AudioContext already resumed by a user gesture. */
  attachAudio: (opts: {
    stream: MediaStream;
    audioContext: AudioContext;
  }) => Promise<void>;
  /** Optional: also feed MediaRecorder webm slices (auto-detect encoding). */
  feedWebmChunk: (chunk: Blob) => void;
  /** Finalize stream and return joined final transcript. */
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

function openDeepgramSocket(
  accessToken: string,
  query: Record<string, string>,
): WebSocket {
  const params = new URLSearchParams(query);
  const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  // JWTs must use "bearer" (API keys use "token") — matches @deepgram/sdk.
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

/**
 * Browser live STT via temporary Deepgram JWT (from /api/deepgram/token).
 * Primary: 16 kHz linear16 PCM through a live AudioContext graph.
 * Backup: MediaRecorder webm/opus slices on a second socket (auto-detect).
 */
export async function startDeepgramLiveSession(opts: {
  onDisplay: (text: string) => void;
  onStatus?: (status: string) => void;
}): Promise<LiveSession | null> {
  const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
  if (!tokenRes.ok) {
    const detail =
      tokenRes.status === 503
        ? "DEEPGRAM_API_KEY not configured"
        : `token grant failed (${tokenRes.status})`;
    opts.onStatus?.(`Live STT unavailable — ${detail}`);
    return null;
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  if (!access_token) {
    opts.onStatus?.("Live STT unavailable — empty token");
    return null;
  }

  const pcmWs = openDeepgramSocket(access_token, {
    model: "nova-3",
    language: "de",
    smart_format: "true",
    punctuate: "true",
    interim_results: "true",
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
  });

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
  let closed = false;
  let gotResult = false;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let mute: GainNode | null = null;
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
        is_final: msg.is_final,
        transcript,
      });
      state = { finals: next.finals, interim: next.interim };
      opts.onDisplay(next.display);
    } catch {
      /* ignore malformed frames */
    }
  };

  pcmWs.onmessage = handleMessage;
  pcmWs.onclose = () => {
    closed = true;
    if (keepAliveId != null) window.clearInterval(keepAliveId);
  };

  keepAliveId = window.setInterval(() => {
    if (pcmWs.readyState === WebSocket.OPEN) {
      pcmWs.send(JSON.stringify({ type: "KeepAlive" }));
    }
    if (webmWs?.readyState === WebSocket.OPEN) {
      webmWs.send(JSON.stringify({ type: "KeepAlive" }));
    }
  }, 8000);

  async function ensureWebmSocket() {
    if (webmStarted || closed) return;
    webmStarted = true;
    try {
      // Fresh JWT — previous one may be near expiry after the PCM handshake.
      const res = await fetch("/api/deepgram/token", { method: "POST" });
      if (!res.ok) return;
      const { access_token: token } = (await res.json()) as {
        access_token: string;
      };
      if (!token) return;
      const ws = openDeepgramSocket(token, {
        model: "nova-3",
        language: "de",
        smart_format: "true",
        punctuate: "true",
        interim_results: "true",
      });
      await waitForOpen(ws, "Deepgram webm socket");
      webmWs = ws;
      ws.onmessage = handleMessage;
      opts.onStatus?.("Live transcription (webm fallback)");
      while (webmQueue.length > 0 && webmWs.readyState === WebSocket.OPEN) {
        const blob = webmQueue.shift();
        if (!blob) break;
        const buf = await blob.arrayBuffer();
        if (webmWs.readyState === WebSocket.OPEN) webmWs.send(buf);
      }
    } catch {
      /* PCM path may still work */
    }
  }

  return {
    async attachAudio({ stream, audioContext }) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      source = audioContext.createMediaStreamSource(stream);
      // 2048 ≈ 40ms at 48kHz — snappier interim results
      processor = audioContext.createScriptProcessor(2048, 1, 1);
      mute = audioContext.createGain();
      mute.gain.value = 0;

      let sentChunks = 0;
      processor.onaudioprocess = (e) => {
        if (closed || pcmWs.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = downsampleTo16k(input, audioContext.sampleRate);
        pcmWs.send(pcmChunkToArrayBuffer(pcm));
        sentChunks += 1;
        if (sentChunks === 1) {
          opts.onStatus?.("Live transcription listening…");
        }
      };

      // ScriptProcessor only fires when connected through to destination.
      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioContext.destination);

      // If PCM produces nothing, spin up containerized webm fallback.
      window.setTimeout(() => {
        if (!gotResult && !closed) void ensureWebmSocket();
      }, 2500);
    },

    feedWebmChunk(chunk: Blob) {
      if (closed || chunk.size === 0) return;
      if (webmWs?.readyState === WebSocket.OPEN) {
        void chunk.arrayBuffer().then((buf) => {
          if (webmWs?.readyState === WebSocket.OPEN) webmWs.send(buf);
        });
        return;
      }
      // Buffer recent slices; flushed if PCM produces no results and fallback starts.
      webmQueue.push(chunk);
      if (webmQueue.length > 40) webmQueue.shift();
      if (webmStarted) void ensureWebmSocket();
    },

    async stop() {
      if (keepAliveId != null) {
        window.clearInterval(keepAliveId);
        keepAliveId = null;
      }
      try {
        processor?.disconnect();
        source?.disconnect();
        mute?.disconnect();
      } catch {
        /* ignore */
      }
      processor = null;
      source = null;
      mute = null;

      const finalize = async (ws: WebSocket | null) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: "Finalize" }));
        await new Promise((r) => setTimeout(r, 500));
        ws.send(JSON.stringify({ type: "CloseStream" }));
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
      await finalize(pcmWs);
      await finalize(webmWs);
      closed = true;
      const finals = state.finals.join(" ").trim();
      const interim = state.interim.trim();
      return finals || interim;
    },
  };
}
