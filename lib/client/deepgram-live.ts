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
  const newLen = Math.floor(float32.length / ratio);
  const out = new Int16Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const idx = Math.floor(i * ratio);
    const s = Math.max(-1, Math.min(1, float32[idx]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/**
 * Browser live STT via temporary Deepgram JWT (from /api/deepgram/token).
 * Streams 16 kHz linear16 PCM (not MediaRecorder webm fragments).
 */
export async function startDeepgramLiveSession(opts: {
  onDisplay: (text: string) => void;
  onStatus?: (status: string) => void;
}): Promise<LiveSession | null> {
  const tokenRes = await fetch("/api/deepgram/token", { method: "POST" });
  if (!tokenRes.ok) {
    opts.onStatus?.("Live STT unavailable — batch backup will run");
    return null;
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  if (!access_token) return null;

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

  // Browser WebSocket cannot set Authorization headers; use token subprotocol.
  const ws = new WebSocket(url, ["token", access_token]);
  ws.binaryType = "arraybuffer";

  let state = { finals: [] as string[], interim: "" };
  let closed = false;
  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error("Deepgram WebSocket timeout"));
      }, 8000);
      ws.onopen = () => {
        window.clearTimeout(timer);
        opts.onStatus?.("Live transcription connected");
        resolve();
      };
      ws.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("Deepgram WebSocket error"));
      };
    });
  } catch {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    opts.onStatus?.("Live STT failed — batch backup will run");
    return null;
  }

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
  };

  return {
    async attachStream(stream: MediaStream) {
      audioCtx = new AudioContext();
      source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but widely supported; keeps deps zero.
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (closed || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = downsampleTo16k(input, audioCtx!.sampleRate);
        ws.send(pcm.buffer);
      };
      source.connect(processor);
      // Keep processor alive without routing mic to speakers.
      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      processor.connect(mute);
      mute.connect(audioCtx.destination);
    },
    async stop() {
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
        await new Promise((r) => setTimeout(r, 400));
        ws.send(JSON.stringify({ type: "CloseStream" }));
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      closed = true;
      return state.finals.join(" ").trim();
    },
  };
}
