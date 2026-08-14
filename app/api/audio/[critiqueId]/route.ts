import { NextResponse } from "next/server";
import { readStore } from "@/lib/store/file-store";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readCritiqueAudio, audioExists } from "@/lib/store/audio-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ critiqueId: string }> },
) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { critiqueId } = await context.params;
  const store = await readStore();
  const critique = store.critiques.find((c) => c.id === critiqueId);
  if (!critique?.audio_path) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
  if (!(await audioExists(critique.audio_path))) {
    return NextResponse.json({ error: "Audio file missing" }, { status: 404 });
  }

  const buf = await readCritiqueAudio(critique.audio_path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/webm",
      "Cache-Control": "private, no-store",
    },
  });
}
