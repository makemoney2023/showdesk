import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { processCritique } from "@/lib/pipeline/process-critique";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    audio_base64?: string;
    live_transcript?: string;
    entry_id: string;
    show_id: string;
  }>(request);
  if (!body?.show_id || !body.entry_id) {
    return NextResponse.json(
      { error: "show_id and entry_id required" },
      { status: 400 },
    );
  }

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === body.entry_id && e.show_id === body.show_id,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const result = await processCritique({
    audioBase64: body.audio_base64,
    liveTranscript: body.live_transcript,
    entryId: body.entry_id,
    showId: body.show_id,
  });

  return NextResponse.json(result);
}
