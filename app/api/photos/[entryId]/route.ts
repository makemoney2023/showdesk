import { NextResponse } from "next/server";
import { readStore, readDogPhoto, photoExists } from "@/lib/store";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { dogPhotoContentType } from "@/lib/domain/dog-photo";

export async function GET(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { entryId } = await context.params;
  const showId = new URL(request.url).searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === entryId && e.show_id === showId,
  );
  if (!entry?.photo_path) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (!(await photoExists(entry.photo_path))) {
    return NextResponse.json({ error: "Photo file missing" }, { status: 404 });
  }

  const buf = await readDogPhoto(entry.photo_path);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": dogPhotoContentType(entry.photo_path),
      "Cache-Control": "private, no-store",
    },
  });
}
