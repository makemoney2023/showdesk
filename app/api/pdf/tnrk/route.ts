import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { buildTnrkSePdf } from "@/lib/pdf/tnrk-se-pdf";
import {
  buildTnrkCritiquePdf,
  resolveCritiqueCertificateNarrative,
} from "@/lib/pdf/tnrk-critique-pdf";
import { buildTnrkAwardPdf } from "@/lib/pdf/tnrk-award-pdf";
import { getAdrkClassLabel } from "@/lib/domain/adrk-template";
import type { AdrkClassId } from "@/lib/domain/adrk-template";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import { resolvePdfJudge } from "@/lib/domain/show-judges";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const kind = searchParams.get("kind") ?? "se";
  const evaluationId = searchParams.get("evaluation_id");
  const critiqueId = searchParams.get("critique_id");
  const entryId = searchParams.get("entry_id");
  const awardTitle = searchParams.get("award_title") ?? "Award";

  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const store = await readStore();
  const show = store.shows.find((s) => s.id === showId);
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (kind === "se") {
    if (!evaluationId) {
      return NextResponse.json(
        { error: "evaluation_id required for SE PDF" },
        { status: 400 },
      );
    }
    const evaluation = (store.se_evaluations ?? []).find(
      (e) => e.id === evaluationId && e.show_id === showId,
    );
    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }
    const pdfBytes = await buildTnrkSePdf(evaluation.form);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="tnrk-se-${evaluation.entry_id}.pdf"`,
      },
    });
  }

  if (kind === "critique") {
    const critique = critiqueId
      ? store.critiques.find((c) => c.id === critiqueId && c.show_id === showId)
      : null;
    const entry = store.entries.find(
      (e) =>
        e.show_id === showId &&
        (entryId ? e.id === entryId : e.id === critique?.entry_id),
    );
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const se = (store.se_evaluations ?? []).find(
      (e) => e.entry_id === entry.id && e.show_id === showId,
    );
    const seSynced =
      critique?.draft.draftAssist?.note?.includes("SE form") ?? false;
    const seNarrative = se
      ? [
          se.form.overall_appearance,
          se.form.comments,
          se.form.final_result
            ? `SE result: ${se.form.final_result.toUpperCase()}`
            : "",
        ]
          .map((s) => s.trim())
          .filter(Boolean)
          .join("\n\n")
      : "";
    const narrative = resolveCritiqueCertificateNarrative({
      draftNarrative: critique?.draft.narrative,
      transcript: critique?.transcript,
      seNarrative,
    });
    const dogName = se?.form.dog_name?.trim() || entry.dog_name;

    const pdfBytes = await buildTnrkCritiquePdf({
      dog_name: dogName,
      dob: se?.form.date_of_birth?.trim() || entry.wt,
      armband: entry.armband,
      narrative,
      class_and_rating: [
        getAdrkClassLabel(entry.class_id as AdrkClassId),
        critique?.draft.formwert ?? "",
        seSynced && se?.form.final_result
          ? `SE ${se.form.final_result.toUpperCase()}`
          : "",
      ]
        .filter(Boolean)
        .join(" — "),
      date: se?.form.date?.trim() || show.date,
      owner: se?.form.owner_co_owner?.trim() || entry.owner,
      co_owner: "",
      judge_signature:
        se?.form.judge_signature?.trim() ||
        resolvePdfJudge({
          critiqueJudge: critique?.judge,
          seJudge: se?.form.judge,
          showJudge: show.judge,
        }),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="tnrk-critique-${entry.armband}.pdf"`,
      },
    });
  }

  if (kind === "award") {
    if (!entryId) {
      return NextResponse.json(
        { error: "entry_id required for award PDF" },
        { status: 400 },
      );
    }
    const entry = store.entries.find(
      (e) => e.id === entryId && e.show_id === showId,
    );
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    const se = (store.se_evaluations ?? []).find(
      (e) => e.entry_id === entry.id && e.show_id === showId,
    );
    const critique = store.critiques.find(
      (c) => c.entry_id === entry.id && c.show_id === showId,
    );
    const pdfBytes = await buildTnrkAwardPdf({
      date: show.date,
      lines: [awardTitle, entry.dog_name, `Owner: ${entry.owner}`],
      judge: resolvePdfJudge({
        critiqueJudge: critique?.judge,
        seJudge: se?.form.judge,
        showJudge: show.judge,
      }),
      show_secretary: "Show Secretary",
    });
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="tnrk-award-${entry.armband}.pdf"`,
      },
    });
  }

  return NextResponse.json(
    { error: "kind must be se, critique, or award" },
    { status: 400 },
  );
}
