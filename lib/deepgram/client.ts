import {
  extractDeepgramTranscript,
  type DeepgramPrerecordedResponse,
} from "./transcript";

export function hasDeepgramKey(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY?.trim());
}

/** Detect WAV / WebM so batch STT is not always labeled audio/webm. */
export function sniffAudioContentType(bytes: Uint8Array): string {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return "audio/wav";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "audio/webm";
  }
  return "audio/webm";
}

export async function grantDeepgramTemporaryToken(opts?: {
  ttlSeconds?: number;
}): Promise<{ access_token: string; expires_in: number }> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }

  const ttlSeconds = opts?.ttlSeconds ?? 600;
  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: ttlSeconds }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Deepgram token grant failed (${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("Deepgram token grant returned no access_token");
  }
  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? ttlSeconds,
  };
}

export async function transcribeWithDeepgram(
  audioBytes: Uint8Array,
  contentType = "audio/webm",
): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set");
  }

  const params = new URLSearchParams({
    model: "nova-3",
    language: "en-US",
    smart_format: "true",
    punctuate: "true",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: Buffer.from(audioBytes),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Deepgram listen failed (${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await res.json()) as DeepgramPrerecordedResponse;
  return extractDeepgramTranscript(payload);
}
