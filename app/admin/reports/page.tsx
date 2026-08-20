"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/status/StatusChip";
import {
  buildReportDocumentsForDog,
  reportDocumentDownloadHref,
  type ReportDocumentLink,
} from "@/lib/domain/report-documents";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  labelDeliveryStatus,
  labelSeStatus,
} from "@/lib/domain/status-labels";
import { getAdrkClassLabel } from "@/lib/domain/adrk-template";
import type { AdrkClassId } from "@/lib/domain/adrk-template";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
} from "@/lib/types";

export default function AdminReportsPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [evaluations, setEvaluations] = useState<SeEvaluationRecord[]>([]);
  const [placements, setPlacements] = useState<PlacementRecord[]>([]);
  const [message, setMessage] = useState("");
  const [hasShow, setHasShow] = useState(true);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setMessage(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load reports",
      );
      return;
    }
    const showData = (await showRes.json()) as { active_show_id: string | null };
    if (!showData.active_show_id) {
      setHasShow(false);
      setShowId(null);
      setCritiques([]);
      setEntries([]);
      setEvaluations([]);
      setPlacements([]);
      return;
    }
    setHasShow(true);
    setShowId(showData.active_show_id);
    const [critRes, entryRes, seRes, placeRes] = await Promise.all([
      fetch(`/api/critiques?show_id=${showData.active_show_id}`),
      fetch(`/api/entries?show_id=${showData.active_show_id}`),
      fetch(`/api/evaluations?show_id=${showData.active_show_id}`),
      fetch(`/api/placements?show_id=${showData.active_show_id}`),
    ]);
    if (!critRes.ok || !entryRes.ok) {
      setMessage("Could not load critique delivery status");
      return;
    }
    setCritiques(
      ((await critRes.json()) as { critiques: CritiqueRecord[] }).critiques,
    );
    setEntries(
      ((await entryRes.json()) as { entries: RosterEntryRecord[] }).entries,
    );
    if (seRes.ok) {
      setEvaluations(
        ((await seRes.json()) as { evaluations: SeEvaluationRecord[] })
          .evaluations,
      );
    } else {
      setEvaluations([]);
    }
    if (placeRes.ok) {
      setPlacements(
        ((await placeRes.json()) as { placements: PlacementRecord[] })
          .placements,
      );
    } else {
      setPlacements([]);
    }
    setMessage("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!showId) return [];
    return [...entries]
      .toSorted((a, b) =>
        a.armband.localeCompare(b.armband, undefined, { numeric: true }),
      )
      .map((entry) => {
        const critique = critiques.find((c) => c.entry_id === entry.id);
        const se = evaluations.find((e) => e.entry_id === entry.id);
        const placement = placements.find((p) => p.entry_id === entry.id);
        const documents = buildReportDocumentsForDog({
          showId,
          entryId: entry.id,
          armband: entry.armband,
          critiqueId: critique?.id ?? null,
          seEvaluationId: se?.id ?? null,
          hasAudio: Boolean(critique?.audio_path),
          hasPlacement: Boolean(placement),
        });
        return { entry, critique, se, placement, documents };
      });
  }, [showId, entries, critiques, evaluations, placements]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Reports
        </h1>
        <p className="text-sm text-sss-text-secondary">
          View or download generated documents per dog for the active show.
        </p>
      </div>
      {message ? (
        <p className="border border-sss-border bg-sss-lifted px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}
      {!hasShow ? (
        <div className="space-y-3 border border-sss-border p-4">
          <p className="text-sm text-sss-text-muted">
            No active show. Create a show and process critiques first.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/entries">Go to Entries</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ entry, critique, se, placement, documents }) => (
            <li
              key={entry.id}
              className="space-y-3 border border-sss-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">
                    #{entry.armband} {entry.dog_name}
                  </h2>
                  <p className="text-xs text-sss-text-muted">
                    {getAdrkClassLabel(entry.class_id as AdrkClassId)}
                    {placement ? ` · Place ${placement.placement}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {critique ? (
                    <StatusChip
                      label={labelCritiqueStatus(critique.status)}
                      tone={critiqueChipTone(critique.status)}
                    />
                  ) : (
                    <StatusChip label="No critique" tone="muted" />
                  )}
                  {se ? (
                    <StatusChip
                      label={labelSeStatus(se.status)}
                      tone={se.status === "complete" ? "success" : "pending"}
                    />
                  ) : null}
                  {critique ? (
                    <span className="text-xs text-sss-text-secondary self-center">
                      Delivery: {labelDeliveryStatus(critique.delivery_status)}
                    </span>
                  ) : null}
                </div>
              </div>
              <DocumentActions documents={documents} />
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="border border-sss-border p-4 text-sm text-sss-text-muted">
              No dogs on the roster yet. Import entries, then record or complete
              SE / critique.
            </li>
          ) : null}
        </ul>
      )}
      <Button variant="outline" onClick={() => void load()}>
        Refresh
      </Button>
    </div>
  );
}

function DocumentActions({
  documents,
}: {
  documents: ReportDocumentLink[];
}) {
  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.kind}
          className="flex flex-wrap items-center justify-between gap-2 border border-sss-border bg-sss-lifted px-3 py-2"
        >
          <span className="text-sm font-medium">{doc.label}</span>
          {doc.available && doc.href ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={doc.href} target="_blank" rel="noreferrer">
                  View
                </a>
              </Button>
              <Button asChild size="sm">
                <a
                  href={reportDocumentDownloadHref(doc.href)}
                  download={doc.filename}
                >
                  Download
                </a>
              </Button>
            </div>
          ) : (
            <span className="text-xs text-sss-text-muted">Not generated yet</span>
          )}
        </li>
      ))}
    </ul>
  );
}
