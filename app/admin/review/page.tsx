"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ADRK_FORMWERT_CODES } from "@/lib/domain/adrk-template";
import {
  canRelease,
  isReviewable,
  pendingReviewCount,
} from "@/lib/domain/critique-status";
import { reviewPrimaryAction } from "@/lib/domain/review-primary-action";
import {
  buildReviewQueueRows,
  reviewPdfPreviewActions,
} from "@/lib/domain/review-queue-layout";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { pushToast } from "@/components/feedback/toast";
import {
  critiqueChipTone,
  labelCritiqueStatus,
} from "@/lib/domain/status-labels";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { StickyDeskBar } from "@/components/desk/StickyDeskBar";
import { StatusChip } from "@/components/status/StatusChip";
import type {
  CritiqueRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
} from "@/lib/types";

export default function AdminReviewPage() {
  const [showId, setShowId] = useState<string | null>(null);
  const [critiques, setCritiques] = useState<CritiqueRecord[]>([]);
  const [entries, setEntries] = useState<RosterEntryRecord[]>([]);
  const [evaluations, setEvaluations] = useState<SeEvaluationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CritiqueRecord["draft"] | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setStatusMsg(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load review queue",
      );
      return;
    }
    const showData = (await showRes.json()) as { active_show_id: string | null };
    const active = showData.active_show_id;
    setShowId(active);
    if (!active) {
      setStatusMsg("No active show — create one on Roster.");
      setCritiques([]);
      setEntries([]);
      setEvaluations([]);
      return;
    }
    const [critRes, entryRes, seRes] = await Promise.all([
      fetch(`/api/critiques?show_id=${active}`),
      fetch(`/api/entries?show_id=${active}`),
      fetch(`/api/evaluations?show_id=${active}`),
    ]);
    if (!critRes.ok || !entryRes.ok) {
      setStatusMsg("Could not load critiques");
      return;
    }
    const critData = (await critRes.json()) as { critiques: CritiqueRecord[] };
    const entryData = (await entryRes.json()) as { entries: RosterEntryRecord[] };
    setCritiques(critData.critiques);
    setEntries(entryData.entries);
    if (seRes.ok) {
      const seData = (await seRes.json()) as {
        evaluations: SeEvaluationRecord[];
      };
      setEvaluations(seData.evaluations);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = critiques.find((c) => c.id === selectedId);
  const entry = selected
    ? entries.find((e) => e.id === selected.entry_id)
    : undefined;
  const seForSelected = selected
    ? evaluations.find((e) => e.entry_id === selected.entry_id)
    : undefined;

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    // Prefer saved draft; if narrative is empty, seed from STT so secretary can edit.
    const seeded =
      selected.draft.narrative.trim()
        ? selected.draft
        : {
            ...selected.draft,
            narrative: selected.transcript.trim(),
          };
    setDraft(seeded);
  }, [selected]);

  async function saveDraft() {
    if (!showId || !selectedId || !draft || busy) return;
    setBusy(true);
    const res = await fetch("/api/critiques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        critique_id: selectedId,
        action: "update_draft",
        draft,
      }),
    });
    const ok = res.ok;
    setStatusMsg(ok ? "Draft saved" : "Save failed");
    pushToast(ok ? "Draft saved" : "Save failed", ok ? "ok" : "error");
    setBusy(false);
    await load();
  }

  async function discardAndRerun() {
    if (!showId || !selectedId || busy) return;
    setBusy(true);
    setStatusMsg("Re-running AI draft…");
    const res = await fetch("/api/critiques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        critique_id: selectedId,
        action: "rerun",
      }),
    });
    const ok = res.ok;
    setStatusMsg(ok ? "Rerun complete — review new draft" : "Rerun failed");
    pushToast(
      ok ? "Rerun complete — review new draft" : "Rerun failed",
      ok ? "ok" : "error",
    );
    setBusy(false);
    await load();
  }

  async function approve() {
    if (!showId || !selectedId || busy) return;
    setBusy(true);
    const res = await fetch("/api/critiques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        critique_id: selectedId,
        action: "approve",
      }),
    });
    if (!res.ok) {
      setStatusMsg("Approve blocked — item is not waiting for review");
      pushToast("Approve blocked — item is not waiting for review", "error");
      setBusy(false);
      setConfirmOpen(false);
      return;
    }
    const release = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, critique_id: selectedId }),
    });
    const releaseData = (await release.json()) as {
      email?: { mock?: boolean; sent?: boolean };
    };
    const msg = releaseData.email?.mock
      ? "Approved — email mocked (no RESEND_API_KEY)"
      : "Approved and release attempted";
    setStatusMsg(msg);
    pushToast(msg);
    setBusy(false);
    setConfirmOpen(false);
    await load();
  }

  const pendingCount = pendingReviewCount(critiques.map((c) => c.status));
  const pending = critiques.filter((c) => isReviewable(c.status));
  const visible = pendingOnly ? pending : critiques;
  const queue = [...visible].toSorted((a, b) => {
    const rank = (s: string) =>
      s === "PENDING_REVIEW" ? 0 : s === "ERROR" ? 1 : s === "PROCESSING" ? 2 : 3;
    return rank(a.status) - rank(b.status) || b.updated_at.localeCompare(a.updated_at);
  });
  const rows = buildReviewQueueRows(
    queue.map((c) => c.id),
    selectedId,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          Review queue
        </h1>
        <p className="text-sm text-sss-text-secondary">
          Secretary approve gate — nothing releases until approved.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">
            {pendingOnly ? `Pending (${pendingCount})` : `All (${critiques.length})`}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingOnly((v) => !v)}
            >
              {pendingOnly ? "Show all" : "Pending only"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs text-sss-text-muted">
          Includes ringside recordings and SE forms synced into review. Select a
          dog to open the editor directly beneath it.
        </p>
        <ul className="space-y-2">
          {rows.map((row) => {
            if (row.kind === "editor") {
              if (!selected || !draft || selected.id !== row.critiqueId) {
                return null;
              }
              return (
                <li key={`editor-${row.critiqueId}`}>
                  <div className="space-y-4 rounded-lg border border-sss-accent bg-sss-lifted p-4">
                    <div>
                      <h2 className="font-medium">{entry?.dog_name}</h2>
                      <details className="text-xs text-sss-text-muted">
                        <summary className="cursor-pointer">Show transcript</summary>
                        <p className="mt-2">{selected.transcript}</p>
                      </details>
                      {seForSelected ? (
                        <p className="mt-1 text-xs text-sss-text-secondary">
                          Ringside SE: <strong>{seForSelected.status}</strong>
                          {seForSelected.form.final_result
                            ? ` · ${seForSelected.form.final_result.toUpperCase()}`
                            : ""}
                          {seForSelected.form.comments?.trim()
                            ? ` · “${seForSelected.form.comments.trim().slice(0, 80)}${seForSelected.form.comments.trim().length > 80 ? "…" : ""}”`
                            : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-sss-text-muted">
                          No SE form synced for this dog yet.
                        </p>
                      )}
                    </div>
                    {selected.audio_path ? (
                      <div className="space-y-1">
                        <Label>Recording</Label>
                        <audio
                          controls
                          className="w-full"
                          src={`/api/audio/${selected.id}`}
                          preload="metadata"
                        >
                          Your browser does not support audio.
                        </audio>
                      </div>
                    ) : (
                      <p className="text-xs text-sss-text-muted">
                        No retained audio for this critique.
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="narrative-draft">Narrative (draft)</Label>
                      <p className="text-xs text-sss-text-muted">
                        Pre-filled from speech-to-text — edit before approve.
                      </p>
                      <Textarea
                        id="narrative-draft"
                        value={draft.narrative}
                        rows={8}
                        onChange={(e) =>
                          setDraft({ ...draft, narrative: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Formwert</Label>
                      <Select
                        value={draft.formwert ?? "none"}
                        onValueChange={(v) =>
                          setDraft({
                            ...draft,
                            formwert:
                              v === "none" ? null : (v as typeof draft.formwert),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {ADRK_FORMWERT_CODES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {showId && selectedId ? (
                      <div className="flex flex-wrap gap-2">
                        {reviewPdfPreviewActions({
                          showId,
                          critiqueId: selectedId,
                          seEvaluationId: seForSelected?.id ?? null,
                        }).map((action) => (
                          <Button key={action.kind} asChild>
                            <a
                              href={action.href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {action.label}
                            </a>
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-sss-text-secondary">
                        More actions
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => void saveDraft()}
                        >
                          Save draft
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void discardAndRerun()}
                          disabled={
                            busy ||
                            (selected.status !== "PENDING_REVIEW" &&
                              selected.status !== "ERROR")
                          }
                        >
                          Discard &amp; rerun
                        </Button>
                        {showId && selectedId ? (
                          <Button asChild variant="link">
                            <a
                              href={`/api/pdf?show_id=${showId}&critique_id=${selectedId}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ADRK draft PDF
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </details>
                    <StickyDeskBar
                      primaryLabel={reviewPrimaryAction(selected.status).label}
                      primaryDisabled={
                        busy || reviewPrimaryAction(selected.status).disabled
                      }
                      primaryHref={
                        reviewPrimaryAction(selected.status).kind === "reports"
                          ? "/admin/reports"
                          : undefined
                      }
                      onPrimary={() => {
                        const kind = reviewPrimaryAction(selected.status).kind;
                        if (kind === "approve") setConfirmOpen(true);
                        if (kind === "retry") void discardAndRerun();
                      }}
                    />
                    <ConfirmDialog
                      open={confirmOpen}
                      title="Release this critique to the owner?"
                      body="Nothing leaves the desk until you confirm."
                      confirmLabel="Confirm"
                      onConfirm={() => void approve()}
                      onCancel={() => setConfirmOpen(false)}
                    />
                    {!canRelease(selected.status) && (
                      <p className="text-xs text-sss-text-muted">
                        Release blocked until secretary approves.
                      </p>
                    )}
                    {statusMsg ? (
                      <p className="text-sm text-sss-accent">{statusMsg}</p>
                    ) : null}
                  </div>
                </li>
              );
            }

            const c = queue.find((item) => item.id === row.critiqueId);
            if (!c) return null;
            const e = entries.find((en) => en.id === c.entry_id);
            const se = evaluations.find((ev) => ev.entry_id === c.entry_id);
            const fromSe =
              Boolean(c.draft.draftAssist?.se_sync) ||
              c.draft.draftAssist?.note?.includes("SE form") ||
              c.transcript.startsWith("Ringside SE");
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedId((prev) => (prev === c.id ? null : c.id))
                  }
                  className={`w-full rounded-md border p-3 text-left ${
                    selectedId === c.id
                      ? "border-sss-accent bg-sss-lifted"
                      : "border-sss-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">
                      {e?.dog_name ?? "Unknown dog"}
                    </div>
                    <StatusChip
                      label={labelCritiqueStatus(c.status)}
                      tone={critiqueChipTone(c.status)}
                    />
                  </div>
                  <div className="text-xs text-sss-text-muted">
                    {fromSe ? "SE form" : "Audio"}
                    {se
                      ? ` · ${se.status === "complete" ? "SE complete" : "Draft"}`
                      : ""}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {queue.length === 0 ? <EmptyDesk variant="no-queue" /> : null}
        {queue.length > 0 && !selectedId ? (
          <EmptyDesk variant="no-selection" />
        ) : null}
        {statusMsg && !selectedId ? (
          <p className="text-sm text-sss-accent">{statusMsg}</p>
        ) : null}
      </section>
    </div>
  );
}
