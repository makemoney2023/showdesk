import { NextResponse } from "next/server";
import { readStore, updateStore } from "@/lib/store";
import { canRelease } from "@/lib/domain/critique-status";
import { buildTnrkCritiquePdfForRecords } from "@/lib/pdf/tnrk-critique-from-records";
import { sendCritiqueEmail } from "@/lib/email/resend";
import { requireSecretaryWrite, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";

export async function POST(request: Request) {
  const auth = await requireSecretaryWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    critique_id: string;
  }>(request);
  if (!body?.show_id || !body.critique_id) {
    return NextResponse.json(
      { error: "show_id and critique_id required" },
      { status: 400 },
    );
  }

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

  if (critique.delivery_status === "sent") {
    return NextResponse.json({
      ok: true,
      already_sent: true,
      email: { sent: true, mock: false },
    });
  }

  const entry = store.entries.find(
    (e) => e.id === critique.entry_id && e.show_id === body.show_id,
  );
  const show = store.shows.find((s) => s.id === body.show_id);
  if (!entry || !show) {
    return NextResponse.json({ error: "Missing entry or show" }, { status: 404 });
  }

  const se = (store.se_evaluations ?? []).find(
    (evaluation) =>
      evaluation.entry_id === entry.id && evaluation.show_id === body.show_id,
  );
  const pdfBytes = await buildTnrkCritiquePdfForRecords({
    show,
    entry,
    critique,
    se,
    placements: store.placements.filter((row) => row.show_id === body.show_id),
  });

  if (!entry.email) {
    await updateStore((s) => ({
      ...s,
      critiques: s.critiques.map((c) =>
        c.id === body.critique_id
          ? {
              ...c,
              delivery_status: "blocked" as const,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    }));
    return NextResponse.json({
      ok: true,
      pdf_size: pdfBytes.length,
      email: { sent: false, mock: false, error: "No owner email on entry" },
    });
  }

  const emailResult = await sendCritiqueEmail({
    to: entry.email,
    ownerName: entry.owner,
    dogName: entry.dog_name,
    showName: show.name,
    pdfBytes,
  });

  // A mocked send (no RESEND_API_KEY) delivered nothing: keep the critique
  // recallable/retryable instead of locking it behind "sent".
  const deliveryStatus = emailResult.sent
    ? emailResult.mock
      ? ("pending" as const)
      : ("sent" as const)
    : ("failed" as const);
  await updateStore((s) => ({
    ...s,
    critiques: s.critiques.map((c) =>
      c.id === body.critique_id
        ? {
            ...c,
            delivery_status: deliveryStatus,
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
