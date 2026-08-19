import { NextResponse } from "next/server";
import { processCritique } from "@/lib/pipeline/process-critique";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    audio_base64?: string;
    live_transcript?: string;
    entry_id: string;
    show_id: string;
  };

  const result = await processCritique({
    audioBase64: body.audio_base64,
    liveTranscript: body.live_transcript,
    entryId: body.entry_id,
    showId: body.show_id,
  });

  return NextResponse.json(result);
}
