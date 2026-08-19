"use client";

import { applyLiveResult } from "@/lib/deepgram/transcript";

type LiveSession = {
  /** Attach to an existing mic MediaStream (opens WS + PCM tap). */
  attachStream: (stream: MediaStream) => Promise<void>;
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
  // TypedArray.buffer may be a larger shared buffer — send only this view.
  return pcm.buffer.slice(
    pcm.byteOffset,
    pcm.byteOffset + pcm.byteLength,
  ) as ArrayBuffer;
}

/**
 * Browser live STT via temporary Deepgram JWT (from /api/deepgram/token).
 * Streams 16 kHz linear16 PCM.
 *
 * Auth: JWTs must use Sec-WebSocket-Protocol `bearer` (API keys use `token`).
 * Matches @deepgram/sdk browser transport.
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

  const params = new URLSearchParams({
    model: "nova-3",
    language: "de",
    smart_format: "true",
    punctuate: "true",
    interim_results: "true",
    encoding: "linear16",
    sample_rate: "16000",
    channels: "1",
  });
  const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

  // JWT → ["bearer", jwt]; API key would be ["token", key]
  const ws = new WebSocket(url, ["bearer", access_token]);
  ws.binaryType = "arraybuffer";

  let state = { finals: [] as string[], interim: "" };
  let closed = false;
  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let keepAliveId: number | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Deepgram WebSocket timeout"));
      }, 10000);
      let settled = false;
      ws.onopen = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        opts.onStatus?.("Live transcription connected");
        resolve();
      };
      ws.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(new Error("Deepgram WebSocket error"));
      };
      ws.onclose = (ev) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(
          new Error(
            `Deepgram WebSocket closed (${ev.code}${ev.reason ? `: ${ev.reason}` : ""})`,
          ),
        );
      };
    });
  } catch (err) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    const msg = err instanceof Error ? err.message : "connect failed";
    opts.onStatus?.(`Live STT failed — ${msg}`);
    return null;
  }

  // Keep silent connections alive (Deepgram closes idle sockets).
  keepAliveId = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "KeepAlive" }));
    }
  }, 8000);

  ws.onmessage = (event) => {
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

  ws.onclose = () => {
    closed = true;
    if (keepAliveId != null) window.clearInterval(keepAliveId);
  };

  return {
    async attachStream(stream: MediaStream) {
      audioCtx = new AudioContext();
      // Browsers often start AudioContext suspended until a user gesture resumes it.
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      source = audioCtx.createMediaStreamSource(stream);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (closed || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = downsampleTo16k(input, audioCtx!.sampleRate);
        ws.send(pcmChunkToArrayBuffer(pcm));
      };
      source.connect(processor);
      // Keep the processor graph alive without playing mic through speakers.
      const sink = audioCtx.createMediaStreamDestination();
      processor.connect(sink);
    },
    async stop() {
      if (keepAliveId != null) {
        window.clearInterval(keepAliveId);
        keepAliveId = null;
      }
      try {
        processor?.disconnect();
        source?.disconnect();
        await audioCtx?.close();
      } catch {
        /* ignore */
      }
      processor = null;
      source = null;
      audioCtx = null;

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "Finalize" }));
        await new Promise((r) => setTimeout(r, 500));
        ws.send(JSON.stringify({ type: "CloseStream" }));
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      closed = true;
      const finals = state.finals.join(" ").trim();
      const interim = state.interim.trim();
      return finals || interim;
    },
  };
}
