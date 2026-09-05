import { NextResponse } from "next/server";
import { parsePublicPdfRequest } from "@/lib/domain/public-pdf";
import { readPublishedPdf } from "@/lib/store/public-pdf";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parsePublicPdfRequest({
    kind: searchParams.get("kind"),
    showId: searchParams.get("show_id"),
    critiqueId: searchParams.get("critique_id"),
    evaluationId: searchParams.get("evaluation_id"),
    entryId: searchParams.get("entry_id"),
  });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const found = await readPublishedPdf(parsed);
  if (!found) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Disposition": `inline; filename="${found.filename}"`,
    },
  });
}
