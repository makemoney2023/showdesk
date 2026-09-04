"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DogAvatar } from "@/components/desk/DogAvatar";
import { DogSearchField } from "@/components/desk/DogSearchField";
import { DivisionFilterChips } from "@/components/desk/DivisionFilterChips";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusChip } from "@/components/status/StatusChip";
import { dogPhotoHrefForEntry } from "@/lib/domain/dog-photo";
import { photoSourceForDog } from "@/lib/domain/dog-identity";
import {
  buildReportDocumentsForDog,
  reportDocumentDownloadHref,
  type ReportDocumentLink,
} from "@/lib/domain/report-documents";
import { dogRecordMatchesSearch } from "@/lib/domain/dog-search";
import {
  divisionsWithDogs,
  entryMatchesDivision,
} from "@/lib/domain/class-division";
import { catalogCompetitionLabel } from "@/lib/domain/catalog-competition";
import {
  compareRosterEntries,
  sanitizeRosterDivisionFilter,
} from "@/lib/domain/roster-view";
import { primaryCritiqueForEntry } from "@/lib/domain/entry-cascade";
import { seEvaluationForEntry } from "@/lib/domain/se-to-critique";
import {
  printBundleDisabledReason,
  printableEntryIdsForDoc,
  rowHasPrintableDocument,
  selectAllPrintableIds,
  tnrkPrintBundleHref,
} from "@/lib/domain/print-documents";
import {
  reportRowMatchesFilter,
  type ReportDeskFilter,
} from "@/lib/domain/report-filters";
import {
  critiqueChipTone,
  labelCritiqueStatus,
  labelDeliveryStatus,
  labelSeStatus,
} from "@/lib/domain/status-labels";
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
  const [filter, setFilter] = useState<ReportDeskFilter>("all");
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setMessage(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load reports",
      );
      setLoaded(true);
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
      setLoaded(true);
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
      setLoaded(true);
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
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    if (!showId) return [];
    return [...entries]
      .toSorted((a, b) => compareRosterEntries(a, b, "class"))
      .map((entry) => {
        const critique = primaryCritiqueForEntry(
          critiques,
          entry.id,
          showId,
        );
        const se = seEvaluationForEntry(evaluations, entries, entry);
        const placement = placements.find((p) => p.entry_id === entry.id);
        const documents = buildReportDocumentsForDog({
          showId,
          entryId: entry.id,
          armband: entry.armband,
          critiqueId: critique?.id ?? null,
          seEvaluationId: se?.id ?? null,
          hasAudio: Boolean(critique?.audio_path),
          hasPlacement: Boolean(placement),
          hasPhoto: Boolean(photoSourceForDog(entries, entry)?.photo_path),
          critiqueStatus: critique?.status,
          seStatus: se?.status,
        });
        return { entry, critique, se, placement, documents };
      });
  }, [showId, entries, critiques, evaluations, placements]);

  const divisions = divisionsWithDogs(entries);
  const activeDivisionFilter = sanitizeRosterDivisionFilter(
    divisionFilter,
    entries,
  );
  const visibleRows = rows.filter(
    (row) =>
      dogRecordMatchesSearch(search, row.entry) &&
      entryMatchesDivision(row.entry, activeDivisionFilter) &&
      reportRowMatchesFilter(
        {
          documents: row.documents,
          deliveryStatus: row.critique?.delivery_status,
        },
        filter,
      ),
  );

  const printRows = visibleRows.map((row) => ({
    entryId: row.entry.id,
    seStatus: row.se?.status,
    critiqueStatus: row.critique?.status,
  }));
  const selectedSeIds = showId
    ? printableEntryIdsForDoc(printRows, "se", selectedIds)
    : [];
  const selectedCertificateIds = showId
    ? printableEntryIdsForDoc(printRows, "critique", selectedIds)
    : [];
  const allPrintableIds = selectAllPrintableIds(printRows);
  const sePrintReason = printBundleDisabledReason(selectedSeIds.length, "se");
  const certificatePrintReason = printBundleDisabledReason(
    selectedCertificateIds.length,
    "critique",
  );

  function toggleSelected(entryId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(entryId)
          ? current
          : [...current, entryId]
        : current.filter((id) => id !== entryId),
    );
  }

  if (!loaded) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Search dogs, then view, download, or print approved SE forms and certificates."
        actions={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />
      {message ? (
        <p className="sss-tray px-3 py-2 text-sm">{message}</p>
      ) : null}
      {!hasShow ? (
        <div className="sss-paper space-y-3 p-5">
          <p className="text-sm text-sss-text-muted">
            No active show. Create a show and process critiques first.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/entries">Go to Entries</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
        <div className="space-y-3">
        <DogSearchField
          value={search}
          onChange={setSearch}
          aria-label="Search reports"
        />
        <DivisionFilterChips
          divisions={divisions}
          value={activeDivisionFilter}
          onChange={setDivisionFilter}
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["ready", "Ready"],
              ["missing", "Missing"],
              ["delivery_failed", "Delivery failed"],
              ["delivery_blocked", "No email"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {allPrintableIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(allPrintableIds)}
            >
              Select all printable
            </Button>
            <PrintBundleButton
              label="Print selected SE forms"
              href={
                showId
                  ? tnrkPrintBundleHref({
                      showId,
                      doc: "se",
                      entryIds: selectedSeIds,
                    })
                  : ""
              }
              disabled={Boolean(sePrintReason)}
              title={sePrintReason ?? undefined}
            />
            <PrintBundleButton
              label="Print selected certificates"
              href={
                showId
                  ? tnrkPrintBundleHref({
                      showId,
                      doc: "critique",
                      entryIds: selectedCertificateIds,
                    })
                  : ""
              }
              disabled={Boolean(certificatePrintReason)}
              title={certificatePrintReason ?? undefined}
            />
          </div>
        ) : null}
        </div>
        <ul className="space-y-3">
          {visibleRows.map(({ entry, critique, se, placement, documents }) => (
            <li key={entry.id}>
              <details className="sss-paper group p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {rowHasPrintableDocument({
                      seStatus: se?.status,
                      critiqueStatus: critique?.status,
                    }) ? (
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(value) =>
                          toggleSelected(entry.id, value === true)
                        }
                        aria-label={`Select ${entry.dog_name} for print`}
                        className="mt-1"
                      />
                    ) : null}
                    <DogAvatar
                      src={
                        dogPhotoHrefForEntry(showId, entries, entry) ?? null
                      }
                    />
                    <div>
                      <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
                        #{entry.armband} {entry.dog_name}
                      </h2>
                      <p className="text-xs text-sss-text-muted">
                        {catalogCompetitionLabel(entry)}
                        {placement ? ` · Place ${placement.placement}` : ""}
                      </p>
                    </div>
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
                      <span className="self-center text-xs text-sss-text-secondary">
                        Delivery: {labelDeliveryStatus(critique.delivery_status)}
                      </span>
                    ) : null}
                  </div>
                </summary>
                <div className="mt-3">
                  <DocumentActions documents={documents} />
                </div>
              </details>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="sss-tray p-5 text-sm text-sss-text-muted">
              No dogs on the roster yet. Import entries, then record or complete
              SE / critique.
            </li>
          ) : null}
          {rows.length > 0 && visibleRows.length === 0 ? (
            <li className="sss-tray p-5 text-sm text-sss-text-muted">
              {search.trim()
                ? `No dogs match “${search}”.`
                : "No dogs match this filter."}
            </li>
          ) : null}
        </ul>
        </div>
      )}
    </div>
  );
}

function PrintBundleButton({
  label,
  href,
  disabled,
  title,
}: {
  label: string;
  href: string;
  disabled: boolean;
  title?: string;
}) {
  if (disabled || !href) {
    return (
      <Button size="sm" disabled title={title}>
        {label}
      </Button>
    );
  }
  return (
    <Button asChild size="sm" title={title}>
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
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
          className={`flex flex-wrap items-center justify-between gap-2 rounded-sss-md px-3 py-2 ${
            doc.available
              ? "bg-sss-success-soft/50"
              : "bg-sss-lifted text-sss-text-muted"
          }`}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            {doc.available ? (
              <CheckCircle2 className="h-4 w-4 text-sss-success" aria-hidden />
            ) : (
              <CircleDashed className="h-4 w-4" aria-hidden />
            )}
            {doc.label}
          </span>
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
              {doc.printable ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Print ${doc.label}`}
                  >
                    Print
                  </a>
                </Button>
              ) : null}
            </div>
          ) : (
            <span className="text-xs text-sss-text-muted">
              {doc.unavailableLabel ?? "Not generated yet"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
