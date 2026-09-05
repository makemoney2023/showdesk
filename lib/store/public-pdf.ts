import { entriesForDog } from "@/lib/domain/dog-identity";
import { canPrintCertificate } from "@/lib/domain/print-documents";
import {
  canPublishSePdf,
  type PublicPdfRequest,
} from "@/lib/domain/public-pdf";
import {
  getPublishedShow,
  isShowResultsPublished,
  showResultsSlug,
} from "@/lib/domain/public-results";
import { catalogDivisionLabel } from "@/lib/domain/catalog-competition";
import {
  resolveSeEvaluationForPdf,
  resolveSeFormForPdf,
} from "@/lib/domain/se-pdf-form";
import { resolvePdfJudge } from "@/lib/domain/show-judges";
import { primaryCritiqueForEntry } from "@/lib/domain/entry-cascade";
import { buildTnrkAwardPdf } from "@/lib/pdf/tnrk-award-pdf";
import { buildTnrkCritiquePdfForRecords } from "@/lib/pdf/tnrk-critique-from-records";
import { buildTnrkSePdf } from "@/lib/pdf/tnrk-se-pdf";
import type {
  AppStore,
  CritiqueRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import { readPublicResultsStore } from "./public-results";

export interface PublishedPdf {
  bytes: Buffer;
  filename: string;
}

export interface PublishedPdfRecords {
  kind: PublicPdfRequest["kind"];
  show: Show;
  entry: RosterEntryRecord;
  critique: CritiqueRecord | null;
  se: SeEvaluationRecord | null;
}

function publishedShowForId(store: AppStore, showId: string): Show | null {
  const show = store.shows.find((item) => item.id === showId) ?? null;
  if (!show || !isShowResultsPublished(show)) return null;
  return getPublishedShow(store, showResultsSlug(show)) ? show : null;
}

function listedEntryIds(store: AppStore, show: Show): Set<string> {
  const published = getPublishedShow(store, showResultsSlug(show));
  return new Set(
    published?.divisions.flatMap((division) =>
      division.dogs.map((dog) => dog.entryId),
    ) ?? [],
  );
}

function isListedDog(
  store: AppStore,
  show: Show,
  entry: RosterEntryRecord,
): boolean {
  const listed = listedEntryIds(store, show);
  if (listed.has(entry.id)) return true;
  const siblings = entriesForDog(
    store.entries.filter((item) => item.show_id === show.id),
    entry,
  );
  return siblings.some((item) => listed.has(item.id));
}

export function resolvePublishedPdfRecords(
  store: AppStore,
  request: PublicPdfRequest,
): PublishedPdfRecords | null {
  const show = publishedShowForId(store, request.showId);
  if (!show) return null;

  if (request.kind === "critique") {
    const critique = store.critiques.find(
      (item) => item.id === request.critiqueId && item.show_id === show.id,
    );
    if (!critique || !canPrintCertificate(critique.status)) return null;
    const entry = store.entries.find(
      (item) => item.id === critique.entry_id && item.show_id === show.id,
    );
    if (!entry || !isListedDog(store, show, entry)) return null;
    const se = resolveSeEvaluationForPdf(
      (store.se_evaluations ?? []).filter((item) => item.show_id === show.id),
      store.entries.filter((item) => item.show_id === show.id),
      entry,
    );
    return { kind: "critique", show, entry, critique, se: se ?? null };
  }

  if (request.kind === "se") {
    const se =
      (store.se_evaluations ?? []).find(
        (item) => item.id === request.evaluationId && item.show_id === show.id,
      ) ?? null;
    if (!se || !canPublishSePdf(se)) return null;
    const entry = store.entries.find(
      (item) => item.id === se.entry_id && item.show_id === show.id,
    );
    if (!entry || !isListedDog(store, show, entry)) return null;
    return { kind: "se", show, entry, critique: null, se };
  }

  const entry = store.entries.find(
    (item) => item.id === request.entryId && item.show_id === show.id,
  );
  if (!entry || !isListedDog(store, show, entry)) return null;
  const hasPlacement = store.placements.some(
    (item) => item.entry_id === entry.id && item.show_id === show.id,
  );
  if (!hasPlacement) return null;
  return { kind: "award", show, entry, critique: null, se: null };
}

export async function readPublishedPdf(
  request: PublicPdfRequest,
): Promise<PublishedPdf | null> {
  const store = await readPublicResultsStore();
  const found = resolvePublishedPdfRecords(store, request);
  if (!found) return null;

  if (found.kind === "critique") {
    const bytes = await buildTnrkCritiquePdfForRecords({
      show: found.show,
      entry: found.entry,
      critique: found.critique,
      se: found.se,
    });
    return {
      bytes: Buffer.from(bytes),
      filename: `critique-${found.entry.armband}.pdf`,
    };
  }

  if (found.kind === "se" && found.se) {
    const bytes = await buildTnrkSePdf(
      resolveSeFormForPdf({
        evaluation: found.se,
        evaluations: store.se_evaluations ?? [],
        entries: store.entries,
      }),
    );
    return {
      bytes: Buffer.from(bytes),
      filename: `se-${found.entry.armband}.pdf`,
    };
  }

  const se = resolveSeEvaluationForPdf(
    (store.se_evaluations ?? []).filter((item) => item.show_id === found.show.id),
    store.entries.filter((item) => item.show_id === found.show.id),
    found.entry,
  );
  const critique = primaryCritiqueForEntry(
    store.critiques,
    found.entry.id,
    found.show.id,
  );
  const bytes = await buildTnrkAwardPdf({
    date: found.entry.competition_day ?? found.show.date,
    lines: [
      found.entry.dog_name,
      catalogDivisionLabel(found.entry),
      `Owner: ${found.entry.owner}`,
    ],
    judge: resolvePdfJudge({
      critiqueJudge: critique?.judge,
      seJudge: se?.form.judge,
      showJudge: found.show.judge,
    }),
    show_secretary: "Show Secretary",
  });
  return {
    bytes: Buffer.from(bytes),
    filename: `award-${found.entry.armband}.pdf`,
  };
}
