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
import { canRelease, isReviewable } from "@/lib/domain/critique-status";
import { reviewPrimaryAction } from "@/lib/domain/review-primary-action";
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
      setStatusMsg("No active show — create one under Entries");
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
    if (selected) setDraft(selected.draft);
  }, [selected]);

  async function saveDraft() {
    if (!showId || !selectedId || !draft) return;
    await fetch("/api/critiques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        critique_id: selectedId,
        action: "update_draft",
        draft,
      }),
    });
    setStatusMsg("Draft saved");
    await load();
  }

  async function discardAndRerun() {
    if (!showId || !selectedId) return;
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
    setStatusMsg(res.ok ? "Rerun complete — review new draft" : "Rerun failed");
    await load();
  }

  async function approve() {
    if (!showId || !selectedId) return;
    if (!window.confirm("Approve and release this critique?")) return;
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
      return;
    }
    const release = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, critique_id: selectedId }),
    });
    const releaseData = (await release.json()) as { email?: { mock?: boolean; sent?: boolean } };
    setStatusMsg(
      releaseData.email?.mock
        ? "Approved — email mocked (no RESEND_API_KEY)"
        : "Approved and release attempted",
    );
    await load();
  }

  const pending = critiques.filter((c) => isReviewable(c.status));
  const visible = pendingOnly ? pending : critiques;
  const queue = [...visible].toSorted((a, b) => {
    const rank = (s: string) =>
      s === "PENDING_REVIEW" ? 0 : s === "ERROR" ? 1 : s === "PROCESSING" ? 2 : 3;
    return rank(a.status) - rank(b.status) || b.updated_at.localeCompare(a.updated_at);
  });

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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">
              {pendingOnly ? `Pending (${pending.length})` : `All (${critiques.length})`}
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
            Includes ringside recordings and SE forms synced into review.
          </p>
          <ul className="space-y-2">
            {queue.map((c) => {
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
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-md border p-3 text-left ${
                      selectedId === c.id
                        ? "border-sss-accent bg-sss-lifted"
                        : "border-sss-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{e?.dog_name ?? "Unknown dog"}</div>
                      <StatusChip
                        label={labelCritiqueStatus(c.status)}
                        tone={critiqueChipTone(c.status)}
                      />
                    </div>
                    <div className="text-xs text-sss-text-muted">
                      {fromSe ? "SE form" : "Audio"}
                      {se ? ` · ${se.status === "complete" ? "SE complete" : "Draft"}` : ""}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {queue.length === 0 ? <EmptyDesk variant="no-queue" /> : null}
        </section>

        <section className="space-y-4 rounded-lg border border-sss-border p-4">
          {selected && draft ? (
            <>
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
                    {showId ? (
                      <>
                        {" · "}
                        <a
                          className="text-sss-accent-deep underline"
                          href={`/api/pdf/tnrk?kind=se&show_id=${showId}&evaluation_id=${seForSelected.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          SE PDF
                        </a>
                      </>
                    ) : null}
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
                <p className="text-xs text-sss-text-muted">No retained audio for this critique.</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="narrative-draft">Narrative (draft)</Label>
                <Textarea
                  id="narrative-draft"
                  value={draft.narrative}
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
                      formwert: v === "none" ? null : (v as typeof draft.formwert),
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
              <details className="text-sm">
                <summary className="cursor-pointer text-sss-text-secondary">
                  More actions
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void saveDraft()}>
                    Save draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void discardAndRerun()}
                    disabled={
                      selected.status !== "PENDING_REVIEW" &&
                      selected.status !== "ERROR"
                    }
                  >
                    Discard &amp; rerun
                  </Button>
                  {showId && selectedId ? (
                    <>
                      <Button asChild variant="link">
                        <a
                          href={`/api/pdf/tnrk?kind=critique&show_id=${showId}&critique_id=${selectedId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          TNRK critique PDF
                        </a>
                      </Button>
                      <Button asChild variant="link">
                        <a
                          href={`/api/pdf?show_id=${showId}&critique_id=${selectedId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ADRK draft PDF
                        </a>
                      </Button>
                    </>
                  ) : null}
                </div>
              </details>
              <StickyDeskBar
                primaryLabel={reviewPrimaryAction(selected.status).label}
                primaryDisabled={reviewPrimaryAction(selected.status).disabled}
                primaryHref={
                  reviewPrimaryAction(selected.status).kind === "reports"
                    ? "/admin/reports"
                    : undefined
                }
                onPrimary={() => {
                  const kind = reviewPrimaryAction(selected.status).kind;
                  if (kind === "approve") void approve();
                  if (kind === "retry") void discardAndRerun();
                }}
              />
              {!canRelease(selected.status) && (
                <p className="text-xs text-sss-text-muted">
                  Release blocked until secretary approves.
                </p>
              )}
            </>
          ) : (
            <EmptyDesk variant="no-selection" />
          )}
          {statusMsg && <p className="text-sm text-sss-accent">{statusMsg}</p>}
        </section>
      </div>
    </div>
  );
}
