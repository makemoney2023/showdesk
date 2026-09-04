import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { buildTnrkSePdf } from "@/lib/pdf/tnrk-se-pdf";
import { buildTnrkAwardPdf } from "@/lib/pdf/tnrk-award-pdf";
import { buildTnrkCritiquePdfForRecords } from "@/lib/pdf/tnrk-critique-from-records";
import { mergePdfDocuments } from "@/lib/pdf/merge-pdfs";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import { resolvePdfJudge } from "@/lib/domain/show-judges";
import {
  DRAFT_PDF_PREVIEW_REQUIRED,
  canPrintCertificate,
  canPrintSe,
  canServeDeskPdf,
  parsePrintBundleRequest,
} from "@/lib/domain/print-documents";
import { primaryCritiqueForEntry } from "@/lib/domain/entry-cascade";
import {
  catalogDivisionLabel,
  competitionDayLabel,
} from "@/lib/domain/catalog-competition";

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
  const asDownload = searchParams.get("download") === "1";
  const preview = searchParams.get("preview") === "1";
  const disposition = asDownload ? "attachment" : "inline";

  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }

  const store = await readStore();
  const show = store.shows.find((s) => s.id === showId);
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (kind === "bundle") {
    const parsed = parsePrintBundleRequest({
      doc: searchParams.get("doc"),
      entryIdsRaw: searchParams.get("entry_ids"),
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const parts: Uint8Array[] = [];
    for (const id of parsed.entryIds) {
      const entry = store.entries.find(
        (item) => item.id === id && item.show_id === showId,
      );
      if (!entry) continue;
      if (parsed.doc === "se") {
        const evaluation = (store.se_evaluations ?? []).find(
          (item) => item.entry_id === entry.id && item.show_id === showId,
        );
        if (!evaluation || !canPrintSe(evaluation.status)) continue;
        parts.push(await buildTnrkSePdf(evaluation.form));
      } else {
        const critique = primaryCritiqueForEntry(
          store.critiques,
          entry.id,
          showId,
        );
        if (!critique || !canPrintCertificate(critique.status)) continue;
        const se = (store.se_evaluations ?? []).find(
          (item) => item.entry_id === entry.id && item.show_id === showId,
        );
        parts.push(
          await buildTnrkCritiquePdfForRecords({
            show,
            entry,
            critique,
            se,
          }),
        );
      }
    }

    if (parts.length === 0) {
      return NextResponse.json(
        { error: "No printable documents in this selection" },
        { status: 400 },
      );
    }

    const pdfBytes = await mergePdfDocuments(parts);
    const filename =
      parsed.doc === "se" ? "tnrk-se-batch.pdf" : "tnrk-certificates-batch.pdf";
    return pdfResponse(pdfBytes, filename);
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
    if (
      !canServeDeskPdf({
        printable: canPrintSe(evaluation.status),
        preview,
      })
    ) {
      return NextResponse.json(
        { error: DRAFT_PDF_PREVIEW_REQUIRED },
        { status: 403 },
      );
    }
    const pdfBytes = await buildTnrkSePdf(evaluation.form);
    return pdfResponse(
      pdfBytes,
      `tnrk-se-${evaluation.entry_id}.pdf`,
      disposition,
    );
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
    if (
      !canServeDeskPdf({
        printable: canPrintCertificate(critique?.status),
        preview,
      })
    ) {
      return NextResponse.json(
        { error: DRAFT_PDF_PREVIEW_REQUIRED },
        { status: 403 },
      );
    }

    const se = (store.se_evaluations ?? []).find(
      (e) => e.entry_id === entry.id && e.show_id === showId,
    );
    const pdfBytes = await buildTnrkCritiquePdfForRecords({
      show,
      entry,
      critique,
      se,
    });

    return pdfResponse(
      pdfBytes,
      `tnrk-critique-${entry.armband}.pdf`,
      disposition,
    );
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
    const critique = primaryCritiqueForEntry(
      store.critiques,
      entry.id,
      showId,
    );
    const pdfBytes = await buildTnrkAwardPdf({
      date: entry.competition_day ?? show.date,
      lines: [
        awardTitle,
        catalogDivisionLabel(entry),
        ...(entry.competition_day
          ? [competitionDayLabel(entry.competition_day)]
          : []),
        entry.dog_name,
        `Owner: ${entry.owner}`,
      ],
      judge: resolvePdfJudge({
        critiqueJudge: critique?.judge,
        seJudge: se?.form.judge,
        showJudge: show.judge,
      }),
      show_secretary: "Show Secretary",
    });
    return pdfResponse(
      pdfBytes,
      `tnrk-award-${entry.armband}.pdf`,
      disposition,
    );
  }

  return NextResponse.json(
    { error: "kind must be se, critique, award, or bundle" },
    { status: 400 },
  );
}

/** Preview the on-screen SE form without waiting for a prior GET cache. */
export async function POST(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    kind?: string;
    show_id?: string;
    form?: TnrkSeForm;
    preview?: boolean;
  };

  if (body.kind !== "se") {
    return NextResponse.json(
      { error: "POST preview is only available for kind=se" },
      { status: 400 },
    );
  }
  if (!body.show_id) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }
  if (!body.form) {
    return NextResponse.json({ error: "form required" }, { status: 400 });
  }
  if (!body.preview) {
    return NextResponse.json(
      { error: DRAFT_PDF_PREVIEW_REQUIRED },
      { status: 403 },
    );
  }

  const store = await readStore();
  const show = store.shows.find((s) => s.id === body.show_id);
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const pdfBytes = await buildTnrkSePdf(body.form);
  return pdfResponse(pdfBytes, "tnrk-se-preview.pdf");
}

function pdfResponse(
  pdfBytes: Uint8Array,
  filename: string,
  disposition: "inline" | "attachment" = "inline",
) {
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
