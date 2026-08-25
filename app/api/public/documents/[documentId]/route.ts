import { NextResponse } from "next/server";
import { readPublishedDogDocument } from "@/lib/store/public-document";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;
  const showId = new URL(request.url).searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const found = await readPublishedDogDocument(showId, documentId);
  if (!found) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.document.content_type,
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Disposition": `inline; filename="${found.document.filename}"`,
    },
  });
}
