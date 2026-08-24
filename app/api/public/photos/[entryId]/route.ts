import { NextResponse } from "next/server";
import { dogPhotoDownloadFilename } from "@/lib/domain/dog-photo";
import { readPublishedDogPhoto } from "@/lib/store/public-photo";

export async function GET(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  const { entryId } = await context.params;
  const url = new URL(request.url);
  const showId = url.searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const photo = await readPublishedDogPhoto(showId, entryId);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Disposition": `inline; filename="${dogPhotoDownloadFilename(photo.dogName, photo.relativePath)}"`,
    },
  });
}
