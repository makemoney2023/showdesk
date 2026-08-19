import {
  extractDeepgramTranscript,
  type DeepgramPrerecordedResponse,
} from "./transcript";

export function hasDeepgramKey(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY?.trim());
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
    language: "de",
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
