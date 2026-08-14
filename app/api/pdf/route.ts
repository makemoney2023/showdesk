import { NextResponse } from "next/server";
import { readStore } from "@/lib/store/file-store";
import { buildAdrkRichterberichtPdf } from "@/lib/pdf/adrk-richterbericht";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const critiqueId = searchParams.get("critique_id");
  if (!showId || !critiqueId) {
    return NextResponse.json({ error: "show_id and critique_id required" }, { status: 400 });
  }

  const store = await readStore();
  const critique = store.critiques.find(
    (c) => c.id === critiqueId && c.show_id === showId,
  );
  const entry = store.entries.find(
    (e) => e.id === critique?.entry_id && e.show_id === showId,
  );
  const show = store.shows.find((s) => s.id === showId);
  if (!critique || !entry || !show) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const placement = store.placements.find(
    (p) => p.entry_id === entry.id && p.show_id === showId,
  );
  const pdfBytes = await buildAdrkRichterberichtPdf({
    show,
    entry,
    draft: {
      ...critique.draft,
      placement: placement?.placement ?? critique.draft.placement,
    },
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="critique-${entry.armband}.pdf"`,
    },
  });
}
