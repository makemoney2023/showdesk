import { NextResponse } from "next/server";
import { readStore, readCritiqueAudio, audioExists } from "@/lib/store";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { sniffAudioContentType } from "@/lib/deepgram/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ critiqueId: string }> },
) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { critiqueId } = await context.params;
  const showId = new URL(request.url).searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const store = await readStore();
  const critique = store.critiques.find(
    (c) => c.id === critiqueId && c.show_id === showId,
  );
  if (!critique?.audio_path) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
  if (!(await audioExists(critique.audio_path))) {
    return NextResponse.json({ error: "Audio file missing" }, { status: 404 });
  }

  const buf = await readCritiqueAudio(critique.audio_path);
  const asDownload = new URL(request.url).searchParams.get("download") === "1";
  const contentType = sniffAudioContentType(new Uint8Array(buf));
  const ext = contentType === "audio/mp4" ? "mp4" : contentType === "audio/wav" ? "wav" : "webm";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      ...(asDownload
        ? {
            "Content-Disposition": `attachment; filename="critique-${critiqueId}.${ext}"`,
          }
        : {}),
    },
  });
}
