import { NextResponse } from "next/server";
import { readStore } from "@/lib/store/file-store";
import { canRelease } from "@/lib/domain/critique-status";
import { buildAdrkRichterberichtPdf } from "@/lib/pdf/adrk-richterbericht";
import { sendCritiqueEmail } from "@/lib/email/resend";
import { updateStore } from "@/lib/store/file-store";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id: string;
    critique_id: string;
  };

  const store = await readStore();
  const critique = store.critiques.find(
    (c) => c.id === body.critique_id && c.show_id === body.show_id,
  );
  if (!critique) {
    return NextResponse.json({ error: "Critique not found" }, { status: 404 });
  }

  if (!canRelease(critique.status)) {
    return NextResponse.json(
      { error: "Critique must be approved before release" },
      { status: 403 },
    );
  }

  const entry = store.entries.find(
    (e) => e.id === critique.entry_id && e.show_id === body.show_id,
  );
  const show = store.shows.find((s) => s.id === body.show_id);
  if (!entry || !show) {
    return NextResponse.json({ error: "Missing entry or show" }, { status: 404 });
  }

  const placement = store.placements.find(
    (p) => p.entry_id === entry.id && p.show_id === body.show_id,
  );
  const pdfBytes = await buildAdrkRichterberichtPdf({
    show,
    entry,
    draft: {
      ...critique.draft,
      placement: placement?.placement ?? critique.draft.placement,
    },
  });

  if (entry.email) {
    const emailResult = await sendCritiqueEmail({
      to: entry.email,
      ownerName: entry.owner,
      dogName: entry.dog_name,
      showName: show.name,
      pdfBytes,
    });

    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === body.critique_id
          ? {
              ...c,
              delivery_status: emailResult.sent ? "sent" : "failed",
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    }));

    return NextResponse.json({
      ok: true,
      pdf_size: pdfBytes.length,
      email: emailResult,
    });
  }

  return NextResponse.json({
    ok: true,
    pdf_size: pdfBytes.length,
    email: { sent: false, mock: false, error: "No owner email on entry" },
  });
}
