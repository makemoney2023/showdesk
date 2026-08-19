import { NextResponse } from "next/server";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import {
  grantDeepgramTemporaryToken,
  hasDeepgramKey,
} from "@/lib/deepgram/client";

/** Short-lived Deepgram JWT for browser live WebSocket (never expose DEEPGRAM_API_KEY). */
export async function POST() {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  if (!hasDeepgramKey()) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not configured" },
      { status: 503 },
    );
  }

  try {
    // Ringside critiques can run several minutes; default grant is ~30s.
    const token = await grantDeepgramTemporaryToken({ ttlSeconds: 600 });
    return NextResponse.json(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token grant failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
