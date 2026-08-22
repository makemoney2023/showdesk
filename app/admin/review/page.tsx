"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADRK_FORMWERT_CODES,
  formatAdrkFormwert,
} from "@/lib/domain/adrk-template";
import {
  divisionLabel,
  divisionsWithDogs,
  entryMatchesDivision,
} from "@/lib/domain/class-division";
import { sanitizeRosterDivisionFilter } from "@/lib/domain/roster-view";
import { DivisionFilterChips } from "@/components/desk/DivisionFilterChips";
import {
  canRecall,
  canRelease,
  deskAttentionCount,
  needsDeskAttention,
} from "@/lib/domain/critique-status";
import { critiqueNarrativeOverflowsCertificate } from "@/lib/domain/tnrk-critique-wrap";
import { reviewPrimaryAction } from "@/lib/domain/review-primary-action";
import {
  nextReviewItemId,
  reviewPdfPreviewActions,
  reviewQueueMatchesSearch,
} from "@/lib/domain/review-queue-layout";
import { isReviewDraftDirty } from "@/lib/domain/review-dirty";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { pushToast } from "@/components/feedback/toast";
import {
  critiqueChipTone,
  labelCritiqueStatus,
} from "@/lib/domain/status-labels";
import { DogAvatar } from "@/components/desk/DogAvatar";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { StickyDeskBar } from "@/components/desk/StickyDeskBar";
import { StatusChip } from "@/components/status/StatusChip";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { dogPhotoHref } from "@/lib/domain/dog-photo";
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
  const [search, setSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveDraftRef = useRef<() => Promise<boolean>>(async () => false);
  const selectCritiqueRef = useRef<(id: string | null) => void>(() => undefined);
  const queueNavRef = useRef({ ids: [] as string[], index: -1 });
  const selectedIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setStatusMsg(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load review queue",
      );
      setLoaded(true);
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
      setLoaded(true);
      return;
    }
    const [critRes, entryRes, seRes] = await Promise.all([
      fetch(`/api/critiques?show_id=${active}`),
      fetch(`/api/entries?show_id=${active}`),
      fetch(`/api/evaluations?show_id=${active}`),
    ]);
    if (!critRes.ok || !entryRes.ok) {
      setStatusMsg("Could not load critiques");
      setLoaded(true);
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
    setLoaded(true);
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
  const dirty = Boolean(
    selected &&
      draft &&
      isReviewDraftDirty(selected.draft, draft),
  );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    const seeded =
      selected.draft.narrative.trim()
        ? selected.draft
        : {
            ...selected.draft,
            narrative: selected.transcript.trim(),
          };
    setDraft(seeded);
  }, [selected]);

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  function selectCritique(id: string | null) {
    if (dirty && id !== selectedId) {
      const leave = window.confirm("Discard unsaved review edits?");
      if (!leave) return;
    }
    setSelectedId((prev) => (prev === id ? null : id));
  }

  async function saveDraft(): Promise<boolean> {
    if (!showId || !selectedId || !draft || busy) return false;
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
    if (ok) await load();
    return ok;
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
    const selectAfter = nextReviewItemId(
      queue.map((item) => item.id),
      selectedId,
    );
    if (dirty) {
      const saved = await saveDraft();
      if (!saved) {
        setConfirmOpen(false);
        return;
      }
    }
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
    await releaseCritique(true, selectAfter);
  }

  async function releaseCritique(
    afterApprove: boolean,
    selectAfter?: string | null,
  ) {
    if (!showId || !selectedId) return;
    setBusy(true);
    const release = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId, critique_id: selectedId }),
    });
    const releaseData = (await release.json().catch(() => ({}))) as {
      email?: { mock?: boolean; sent?: boolean; error?: string };
      already_sent?: boolean;
      error?: string;
    };
    const prefix = afterApprove ? "Approved" : "Release";
    let msg: string;
    let ok = release.ok;
    if (!release.ok) {
      msg = `${prefix} — release failed${releaseData.error ? `: ${releaseData.error}` : ""}`;
    } else if (releaseData.already_sent) {
      msg = `${prefix} — already emailed`;
    } else if (releaseData.email?.error) {
      msg = `${prefix} — ${releaseData.email.error}`;
      ok = false;
    } else if (releaseData.email?.mock) {
      msg = `${prefix} — email mocked (no RESEND_API_KEY)`;
    } else if (releaseData.email?.sent) {
      msg = `${prefix} and emailed to owner`;
    } else {
      msg = `${prefix} — delivery pending`;
    }
    setStatusMsg(msg);
    pushToast(msg, ok ? "ok" : "error");
    setBusy(false);
    setConfirmOpen(false);
    await load();
    if (afterApprove) setSelectedId(selectAfter ?? null);
  }

  async function recallCritique() {
    if (!showId || !selectedId || busy) return;
    setBusy(true);
    const res = await fetch("/api/critiques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showId,
        critique_id: selectedId,
        action: "recall",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    const ok = res.ok;
    const msg = ok
      ? "Recalled to review queue"
      : (data.error ?? "Recall failed");
    setStatusMsg(msg);
    pushToast(msg, ok ? "ok" : "error");
    setBusy(false);
    setRecallOpen(false);
    if (ok) await load();
  }

  const attentionCount = deskAttentionCount(critiques.map((c) => c.status));
  const attention = critiques.filter((c) => needsDeskAttention(c.status));
  const visible = pendingOnly ? attention : critiques;
  const divisions = divisionsWithDogs(entries);
  const activeDivisionFilter = sanitizeRosterDivisionFilter(
    divisionFilter,
    entries,
  );
  const searched = visible.filter((critique) => {
    const queueEntry = entries.find(
      (entryItem) => entryItem.id === critique.entry_id,
    );
    return (
      Boolean(queueEntry) &&
      entryMatchesDivision(queueEntry!, activeDivisionFilter) &&
      reviewQueueMatchesSearch(search, critique, queueEntry)
    );
  });
  const queue = [...searched].toSorted((a, b) => {
    const rank = (s: string) =>
      s === "PENDING_REVIEW" ? 0 : s === "ERROR" ? 1 : s === "PROCESSING" ? 2 : 3;
    return rank(a.status) - rank(b.status) || b.updated_at.localeCompare(a.updated_at);
  });
  const selectedIndex = queue.findIndex((item) => item.id === selectedId);
  saveDraftRef.current = saveDraft;
  selectCritiqueRef.current = selectCritique;
  queueNavRef.current = {
    ids: queue.map((item) => item.id),
    index: selectedIndex,
  };
  selectedIdRef.current = selectedId;

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        if (!selectedIdRef.current) return;
        event.preventDefault();
        void saveDraftRef.current();
        return;
      }
      if (!event.altKey || editing) return;
      const { ids, index } = queueNavRef.current;
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        selectCritiqueRef.current(ids[index - 1] ?? null);
      }
      if (event.key === "ArrowRight" && index >= 0 && index < ids.length - 1) {
        event.preventDefault();
        selectCritiqueRef.current(ids[index + 1] ?? null);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  if (!loaded) {
    return <PageSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Secretary approve gate — nothing releases until approved."
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">
            {pendingOnly
              ? `Needs attention (${attentionCount})`
              : `All (${critiques.length})`}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPendingOnly((v) => !v)}
            >
              {pendingOnly ? "Show all" : "Needs attention"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs text-sss-text-muted">
          Includes ringside recordings and SE forms synced into review. Select a
          dog to edit, then approve.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sss-text-muted"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dog, armband, owner, or judge"
              aria-label="Search review queue"
              className="pl-9"
            />
          </div>
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          ) : null}
          <span className="text-xs text-sss-text-muted">
            ⌘/Ctrl+S saves · Alt+←/→ navigates
          </span>
        </div>
        <DivisionFilterChips
          divisions={divisions}
          value={activeDivisionFilter}
          onChange={setDivisionFilter}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
          <ul className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
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
                    onClick={() => selectCritique(c.id)}
                    className={`sss-interactive w-full rounded-sss-lg border p-3 text-left ${
                      selectedId === c.id
                        ? "border-sss-accent bg-sss-lifted shadow-sss-card"
                        : "border-sss-border bg-sss-elevated"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <DogAvatar
                          size="sm"
                          src={
                            e?.photo_path && showId
                              ? dogPhotoHref(showId, e.id, {
                                  cacheBust: e.photo_path,
                                })
                              : null
                          }
                        />
                        <div>
                          <div className="font-medium">
                            {e?.dog_name ?? "Unknown dog"}
                          </div>
                          <div className="text-xs text-sss-text-muted">
                            {e ? `#${e.armband}` : ""}
                            {e
                              ? ` · ${divisionLabel(e)}`
                              : ""}
                            {` · ${fromSe ? "SE form" : "Audio"}`}
                            {se
                              ? ` · ${se.status === "complete" ? "SE complete" : "Draft"}`
                              : ""}
                          </div>
                        </div>
                      </div>
                      <StatusChip
                        label={labelCritiqueStatus(c.status)}
                        tone={critiqueChipTone(c.status)}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="min-w-0">
            {selected && draft ? (
              <div className="sss-paper space-y-4 border-sss-accent p-5 lg:sticky lg:top-24">
                {queue.length > 0 && selectedIndex >= 0 ? (
                  <div className="flex items-center justify-between gap-2 lg:hidden">
                    <p className="text-xs text-sss-text-muted">
                      Item {selectedIndex + 1} of {queue.length}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={selectedIndex <= 0}
                        onClick={() =>
                          selectCritique(queue[selectedIndex - 1]?.id ?? null)
                        }
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={selectedIndex >= queue.length - 1}
                        onClick={() =>
                          selectCritique(queue[selectedIndex + 1]?.id ?? null)
                        }
                      >
                        Next
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{entry?.dog_name}</h2>
                    {dirty ? (
                      <span className="rounded-full bg-sss-warning-soft px-2 py-0.5 text-xs text-sss-warning">
                        Unsaved
                      </span>
                    ) : null}
                  </div>
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
                      src={`/api/audio/${selected.id}?show_id=${encodeURIComponent(showId ?? "")}`}
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
                  {selected.status === "ERROR" && selected.error_message ? (
                    <p className="text-sm text-destructive">
                      Processing failed: {selected.error_message}
                    </p>
                  ) : null}
                  <p className="text-xs text-sss-text-muted">
                    Pre-filled from speech-to-text — edit before approve.
                  </p>
                  {draft.narrative &&
                  critiqueNarrativeOverflowsCertificate(draft.narrative) ? (
                    <p className="text-xs text-destructive">
                      Narrative is longer than the printed certificate
                      (12 lines). Extra text is cut on the TNRK PDF.
                    </p>
                  ) : null}
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
                  <Label>Rating</Label>
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
                          {formatAdrkFormwert(code)}
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
                          href={`/api/pdf?show_id=${showId}&critique_id=${selectedId}&preview=1`}
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
                  body={
                    dirty
                      ? "Unsaved edits will be saved first. You can recall this if the email has not been sent."
                      : "Nothing leaves the desk until you confirm. You can recall this if the email has not been sent."
                  }
                  confirmLabel="Confirm"
                  onConfirm={() => void approve()}
                  onCancel={() => setConfirmOpen(false)}
                />
                {canRelease(selected.status) &&
                selected.delivery_status !== "sent" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void releaseCritique(false)}
                    >
                      Retry email
                    </Button>
                    {canRecall(selected.status, selected.delivery_status) ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => setRecallOpen(true)}
                      >
                        Recall to review
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <ConfirmDialog
                  open={recallOpen}
                  title="Recall this critique?"
                  body="Return it to the review queue. Owners will not be emailed again until you approve."
                  confirmLabel="Recall"
                  onConfirm={() => void recallCritique()}
                  onCancel={() => setRecallOpen(false)}
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
            ) : null}
          </div>
        </div>
        {queue.length === 0 && !search ? <EmptyDesk variant="no-queue" /> : null}
        {queue.length === 0 && search ? (
          <p className="sss-tray p-4 text-sm text-sss-text-muted">
            No review items match “{search}”.
          </p>
        ) : null}
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
