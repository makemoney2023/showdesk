"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BEHAVIOR_OPTIONS,
  BONE_STRENGTH_OPTIONS,
  CHEEK_BONE_OPTIONS,
  GUNFIRE_OPTIONS,
  HEAD_SHAPE_OPTIONS,
  formatSeMissingFields,
  seCompletionGaps,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import { seSectionProgress } from "@/lib/domain/show-day";
import { canRecordWithJudge, syncShowJudges } from "@/lib/domain/show-judges";
import { stickyJudgeForShow } from "@/lib/client/sticky-judge";
import { useRingsideJudge } from "@/components/ringside/RingsideJudgeContext";
import { SeStepper } from "@/components/ringside/SeStepper";
import { BackLink } from "@/components/layout/BackLink";
import { EmptyDesk } from "@/components/desk/EmptyDesk";
import { DogPhotoField } from "@/components/roster/DogPhotoField";
import { dogPhotoHref } from "@/lib/domain/dog-photo";
import {
  clearRecoverableSeDraft,
  readRecoverableSeDraft,
  seFormFingerprint,
  shouldRestoreSeDraft,
  writeRecoverableSeDraft,
} from "@/lib/offline/se-draft";
import { enqueueSeDraft, removeQueuedSeDraft } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import type { RosterEntryRecord, SeEvaluationRecord, Show } from "@/lib/types";

const HEAD_LABELS: Record<(typeof HEAD_SHAPE_OPTIONS)[number], string> = {
  too_small: "Too small",
  slight_narrow: "Slight / narrow",
  sufficient_strong: "Sufficient / strong",
  strong_typey: "Strong / typey",
  too_large: "Too large",
};

const CHEEK_LABELS: Record<(typeof CHEEK_BONE_OPTIONS)[number], string> = {
  lacking: "Lacking",
  slight: "Slight",
  medium: "Medium",
  distinct: "Distinct",
  too_strong: "Too strong",
};

const BONE_LABELS: Record<(typeof BONE_STRENGTH_OPTIONS)[number], string> = {
  fine: "Fine",
  sufficient: "Sufficient",
  medium: "Medium",
  strong: "Strong",
  coarse: "Coarse",
};

const BEH_LABELS: Record<(typeof BEHAVIOR_OPTIONS)[number], string> = {
  fearful_shy: "Fearful / shy",
  reserved: "Reserved",
  calm_neutral: "Calm / neutral",
  self_confident: "Self-confident",
  uncontrollable: "Uncontrollable",
};

const GUN_LABELS: Record<(typeof GUNFIRE_OPTIONS)[number], string> = {
  no_reaction: "No reaction",
  sensitive: "Sensitive",
  shy: "Shy",
};

export default function StewardSeFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const entryId = params.id as string;
  const divisionParam = searchParams.get("division");
  const ringsideHref = divisionParam
    ? `/ringside?division=${encodeURIComponent(divisionParam)}`
    : "/ringside";
  const ringsideJudge = useRingsideJudge();
  const [entry, setEntry] = useState<RosterEntryRecord | null>(null);
  const [showId, setShowId] = useState<string | null>(null);
  const [judgePick, setJudgePick] = useState<string | null>(null);
  const [judges, setJudges] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<SeEvaluationRecord | null>(null);
  const [form, setForm] = useState<TnrkSeForm | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const serverFingerprintRef = useRef("");
  const serverUpdatedAtRef = useRef("");
  const latestFormRef = useRef<TnrkSeForm | null>(null);

  const load = useCallback(async () => {
    setRecoveryReady(false);
    setAutosaveStatus("");
    const showRes = await fetch("/api/shows");
    if (!showRes.ok) {
      setStatus(
        showRes.status === 401
          ? "Session expired — sign in again"
          : "Could not load show",
      );
      return;
    }
    const showData = (await showRes.json()) as {
      shows: Show[];
      active_show_id: string | null;
    };
    if (!showData.active_show_id) {
      setStatus("No active show");
      return;
    }
    setShowId(showData.active_show_id);
    const active =
      showData.shows.find((s) => s.id === showData.active_show_id) ?? null;
    const names = syncShowJudges(active ?? {}).judges;
    const pick = stickyJudgeForShow(showData.active_show_id, names);
    setJudges(names);
    setJudgePick(pick);

    const entriesRes = await fetch(
      `/api/entries?show_id=${showData.active_show_id}`,
    );
    if (!entriesRes.ok) {
      setStatus("Could not load entry");
      return;
    }
    const entriesData = (await entriesRes.json()) as {
      entries: RosterEntryRecord[];
    };
    const found = entriesData.entries.find((e) => e.id === entryId) ?? null;
    setEntry(found);
    if (!found) {
      setStatus("Entry not found");
      return;
    }

    const createRes = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: showData.active_show_id,
        entry_id: entryId,
        judge: pick ?? undefined,
      }),
    });
    if (!createRes.ok) {
      setStatus("Could not open SE evaluation");
      return;
    }
    const createData = (await createRes.json()) as {
      evaluation: SeEvaluationRecord;
    };
    setEvaluation(createData.evaluation);
    const nextForm = createData.evaluation.form;
    const serverForm =
      pick && !nextForm.judge.trim()
        ? { ...nextForm, judge: pick }
        : nextForm;
    serverFingerprintRef.current = seFormFingerprint(serverForm);
    serverUpdatedAtRef.current = createData.evaluation.updated_at;

    const recoverable = await readRecoverableSeDraft(
      showData.active_show_id,
      entryId,
    );
    if (
      createData.evaluation.status === "draft" &&
      recoverable &&
      shouldRestoreSeDraft(recoverable, createData.evaluation)
    ) {
      setForm(recoverable.form);
      setStatus("Recovered unsaved changes");
      setAutosaveStatus("Recovered from this device");
    } else {
      setForm(serverForm);
      setStatus(
        createData.evaluation.status === "complete" ? "Complete" : "Draft",
      );
      if (recoverable) {
        await clearRecoverableSeDraft(showData.active_show_id, entryId);
      }
    }
    setRecoveryReady(true);
  }, [entryId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ringsideJudge.available) return;
    setJudgePick(ringsideJudge.judge || null);
    setJudges(ringsideJudge.judges);
    if (ringsideJudge.judge) {
      setForm((prev) => (prev ? { ...prev, judge: ringsideJudge.judge } : prev));
    }
  }, [ringsideJudge.available, ringsideJudge.judge, ringsideJudge.judges]);

  useEffect(() => {
    latestFormRef.current = form;
    if (
      !recoveryReady ||
      !form ||
      !showId ||
      !evaluation ||
      evaluation.entry_id !== entryId ||
      evaluation.status === "complete" ||
      seFormFingerprint(form) === serverFingerprintRef.current
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void writeRecoverableSeDraft({
        showId,
        entryId,
        evaluationId: evaluation.id,
        form,
        savedAt: new Date().toISOString(),
        serverUpdatedAt: serverUpdatedAtRef.current,
      })
        .then(() => setAutosaveStatus("Saved on this device"))
        .catch(() => setAutosaveStatus("Local recovery unavailable"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [entryId, evaluation, form, recoveryReady, showId]);

  useEffect(() => {
    function persistLatestDraft() {
      const latest = latestFormRef.current;
      if (
        !recoveryReady ||
        !latest ||
        !showId ||
        !evaluation ||
        evaluation.entry_id !== entryId ||
        evaluation.status === "complete" ||
        seFormFingerprint(latest) === serverFingerprintRef.current
      ) {
        return;
      }
      void writeRecoverableSeDraft({
        showId,
        entryId,
        evaluationId: evaluation.id,
        form: latest,
        savedAt: new Date().toISOString(),
        serverUpdatedAt: serverUpdatedAtRef.current,
      });
    }
    window.addEventListener("pagehide", persistLatestDraft);
    return () => window.removeEventListener("pagehide", persistLatestDraft);
  }, [entryId, evaluation, recoveryReady, showId]);

  function patchForm<K extends keyof TnrkSeForm>(key: K, value: TnrkSeForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function patchMeasurement(
    key: keyof TnrkSeForm["measurements"],
    value: string,
  ) {
    setForm((prev) =>
      prev
        ? { ...prev, measurements: { ...prev.measurements, [key]: value } }
        : prev,
    );
  }

  async function save(markComplete = false) {
    if (!showId || !evaluation || !form) {
      setActionError(true);
      setActionMsg("Form is still loading — wait a moment and try again");
      return;
    }
    const nextForm =
      judgePick && !form.judge.trim()
        ? { ...form, judge: judgePick }
        : form;
    if (markComplete && !canRecordWithJudge(nextForm.judge, judges)) {
      setActionError(true);
      setActionMsg("Select a judge");
      return;
    }
    const activeShowId = showId;
    const activeEvaluation = evaluation;
    setSaving(true);
    setActionMsg(markComplete ? "Marking complete…" : "Saving draft…");
    setActionError(false);

    async function queueOfflineSave(message: string) {
      await writeRecoverableSeDraft({
        showId: activeShowId,
        entryId,
        evaluationId: activeEvaluation.id,
        form: nextForm,
        savedAt: new Date().toISOString(),
        serverUpdatedAt: serverUpdatedAtRef.current,
      });
      await enqueueSeDraft({
        id: `se-${activeEvaluation.id}`,
        entryId,
        showId: activeShowId,
        evaluationId: activeEvaluation.id,
        form: nextForm,
        markComplete,
        createdAt: new Date().toISOString(),
      });
      setActionError(true);
      setActionMsg(message);
      setAutosaveStatus("Queued on this device");
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await queueOfflineSave("Offline — saved to sync queue");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          evaluation_id: evaluation.id,
          form: nextForm,
          mark_complete: markComplete,
        }),
      });
      const data = (await res.json()) as {
        evaluation?: SeEvaluationRecord;
        error?: string;
        missing?: string[];
      };
      if (!res.ok) {
        const detail = data.missing?.length
          ? formatSeMissingFields(data.missing)
          : (data.error ?? "Save failed");
        const msg =
          data.error === "Incomplete SE form"
            ? `Select Pass/Fail (and fill required fields): ${detail}`
            : detail;
        setActionError(true);
        setActionMsg(msg);
        setStatus(msg);
        return;
      }
      if (data.evaluation) {
        setEvaluation(data.evaluation);
        setForm(data.evaluation.form);
        serverFingerprintRef.current = seFormFingerprint(data.evaluation.form);
        serverUpdatedAtRef.current = data.evaluation.updated_at;
        await clearRecoverableSeDraft(activeShowId, entryId);
        await removeQueuedSeDraft(`se-${activeEvaluation.id}`);
        setAutosaveStatus("Saved to desk");
      }
      const okMsg =
        markComplete || data.evaluation?.status === "complete"
          ? "Marked complete"
          : "Draft saved";
      setActionError(false);
      setActionMsg(okMsg);
      setStatus(okMsg);
    } catch {
      await queueOfflineSave("Network error — saved to offline queue");
    } finally {
      setSaving(false);
    }
  }

  if (!form || !entry) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-sss-text-muted">{status}</p>
        <BackLink href={ringsideHref}>Back to dogs</BackLink>
      </div>
    );
  }

  const formForComplete =
    judgePick && !form.judge.trim() ? { ...form, judge: judgePick } : form;
  const gaps = seCompletionGaps(formForComplete);
  const sections = seSectionProgress(form);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-40">
      <BackLink href={ringsideHref}>Back to dogs</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-start gap-3">
          {showId && entry.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dogPhotoHref(showId, entry.id, { cacheBust: entry.photo_path })}
              alt=""
              className="h-16 w-16 rounded-md border border-sss-border object-cover"
            />
          ) : null}
          <div>
          <p className="text-xs uppercase tracking-wide text-sss-text-muted">
            Ring steward · Standard Evaluation (SE)
          </p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
            {entry.dog_name}
          </h1>
          <p className="text-sm text-sss-text-secondary">
            #{entry.armband} · {status}
          </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={ringsideHref}>Ringside</Link>
          </Button>
          {showId && evaluation ? (
            <Button asChild variant="outline">
              <a
                href={`/api/pdf/tnrk?kind=se&show_id=${showId}&evaluation_id=${evaluation.id}&preview=1`}
                target="_blank"
                rel="noreferrer"
              >
                Preview PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {!canRecordWithJudge(judgePick ?? form.judge, judges) ? (
        <EmptyDesk variant="select-judge" />
      ) : null}

      <SeSectionObserver sections={sections} />

      <section id="se-identification" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Identification
        </h2>
        {showId ? (
          <DogPhotoField
            showId={showId}
            entryId={entry.id}
            photoPath={entry.photo_path}
            preferCamera
            onChanged={(photo_path) =>
              setEntry({ ...entry, photo_path })
            }
          />
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <Input
              type="date"
              value={form.date}
              onChange={(e) => patchForm("date", e.target.value)}
            />
          </Field>
          <Field label="Club">
            <Input
              value={form.club}
              onChange={(e) => patchForm("club", e.target.value)}
            />
          </Field>
          <Field label="Judge">
            <Input
              value={form.judge}
              onChange={(e) => patchForm("judge", e.target.value)}
            />
          </Field>
          <Field label="Dog's name">
            <Input
              value={form.dog_name}
              onChange={(e) => patchForm("dog_name", e.target.value)}
            />
          </Field>
          <Field label="Registration number">
            <Input
              value={form.registration_number}
              onChange={(e) =>
                patchForm("registration_number", e.target.value)
              }
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => patchForm("date_of_birth", e.target.value)}
            />
          </Field>
          <Field label="Microchip Nr">
            <Input
              value={form.microchip_nr}
              onChange={(e) => patchForm("microchip_nr", e.target.value)}
            />
          </Field>
          <Field label="Tattoo Nr">
            <Input
              value={form.tattoo_nr}
              onChange={(e) => patchForm("tattoo_nr", e.target.value)}
            />
          </Field>
        </div>
        <div className="flex gap-4">
          <Radio
            name="sex"
            checked={form.sex === "male"}
            onChange={() => patchForm("sex", "male")}
            label="Male"
          />
          <Radio
            name="sex"
            checked={form.sex === "female"}
            onChange={() => patchForm("sex", "female")}
            label="Female"
          />
        </div>
      </section>

      <section id="se-pedigree" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Pedigree & ownership
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sire">
            <Input
              value={form.sire}
              onChange={(e) => patchForm("sire", e.target.value)}
            />
          </Field>
          <Field label="Sire Reg.-Nr.">
            <Input
              value={form.sire_reg}
              onChange={(e) => patchForm("sire_reg", e.target.value)}
            />
          </Field>
          <Field label="Dam">
            <Input
              value={form.dam}
              onChange={(e) => patchForm("dam", e.target.value)}
            />
          </Field>
          <Field label="Dam Reg.-Nr.">
            <Input
              value={form.dam_reg}
              onChange={(e) => patchForm("dam_reg", e.target.value)}
            />
          </Field>
          <Field label="Breeder">
            <Input
              value={form.breeder}
              onChange={(e) => patchForm("breeder", e.target.value)}
            />
          </Field>
          <Field label="HD/ED JLPP Nr">
            <Input
              value={form.hd_ed_jlpp_nr}
              onChange={(e) => patchForm("hd_ed_jlpp_nr", e.target.value)}
            />
          </Field>
          <Field label="Owner / co-owner">
            <Input
              value={form.owner_co_owner}
              onChange={(e) => patchForm("owner_co_owner", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(e) => patchForm("email", e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => patchForm("address", e.target.value)}
            />
          </Field>
          <Field label="Handler">
            <Input
              value={form.handler}
              onChange={(e) => patchForm("handler", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => patchForm("phone", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section id="se-measurements" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Measurements
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["height", "Height / Widerrist"],
              ["chest_depth", "Chest depth"],
              ["weight", "Weight"],
              ["body_length", "Body length"],
              ["chest_circumference", "Chest circumference"],
              ["eye_color", "Eye color"],
              ["muzzle_length", "Muzzle length"],
              ["skull", "Skull"],
              ["legible_tattoo", "Legible tattoo"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                value={form.measurements[key]}
                onChange={(e) => patchMeasurement(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </section>

      <section id="se-bite" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Bite & dentition
        </h2>
        <div className="flex flex-wrap gap-4">
          <Radio
            name="bite"
            checked={form.bite === "correct_scissor"}
            onChange={() => patchForm("bite", "correct_scissor")}
            label="Correct scissor bite"
          />
          <Radio
            name="bite"
            checked={form.bite === "other"}
            onChange={() => patchForm("bite", "other")}
            label="Other"
          />
        </div>
        {form.bite === "other" && (
          <Field label="Other details">
            <Input
              value={form.bite_other}
              onChange={(e) => patchForm("bite_other", e.target.value)}
            />
          </Field>
        )}
      </section>

      <section id="se-appearance" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Overall appearance and behavior
        </h2>
        <Textarea
          rows={4}
          value={form.overall_appearance}
          onChange={(e) => patchForm("overall_appearance", e.target.value)}
          placeholder="Free-form evaluation notes…"
        />
      </section>

      <section id="se-ratings" className="sss-paper space-y-4 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Detailed ratings
        </h2>
        <OptionRow
          label="Head shape"
          options={HEAD_SHAPE_OPTIONS}
          labels={HEAD_LABELS}
          value={form.head_shape}
          onChange={(v) => patchForm("head_shape", v)}
        />
        <OptionRow
          label="Cheek bone"
          options={CHEEK_BONE_OPTIONS}
          labels={CHEEK_LABELS}
          value={form.cheek_bone}
          onChange={(v) => patchForm("cheek_bone", v)}
        />
        <OptionRow
          label="Bone strength"
          options={BONE_STRENGTH_OPTIONS}
          labels={BONE_LABELS}
          value={form.bone_strength}
          onChange={(v) => patchForm("bone_strength", v)}
        />
        <OptionRow
          label="General behavior"
          options={BEHAVIOR_OPTIONS}
          labels={BEH_LABELS}
          value={form.general_behavior}
          onChange={(v) => patchForm("general_behavior", v)}
        />
      </section>

      <section id="se-result" className="sss-paper space-y-3 p-5">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          Gunfire & result
        </h2>
        <OptionRow
          label="Reaction to gunfire"
          options={GUNFIRE_OPTIONS}
          labels={GUN_LABELS}
          value={form.gunfire}
          onChange={(v) => patchForm("gunfire", v)}
        />
        <Field label="Comments">
          <Input
            value={form.comments}
            onChange={(e) => patchForm("comments", e.target.value)}
          />
        </Field>
        <div className="flex gap-4">
          <Radio
            name="final"
            checked={form.final_result === "pass"}
            onChange={() => patchForm("final_result", "pass")}
            label="PASS / Bestanden"
          />
          <Radio
            name="final"
            checked={form.final_result === "fail"}
            onChange={() => patchForm("final_result", "fail")}
            label="FAIL / Nicht bestanden"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Judge's signature">
            <Input
              value={form.judge_signature}
              onChange={(e) => patchForm("judge_signature", e.target.value)}
            />
          </Field>
          <Field label="Event secretary">
            <Input
              value={form.event_secretary}
              onChange={(e) => patchForm("event_secretary", e.target.value)}
            />
          </Field>
          <Field label="Signature date">
            <Input
              type="date"
              value={form.signature_date}
              onChange={(e) => patchForm("signature_date", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-sss-border bg-sss-elevated/95 shadow-sss-overlay backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
          >
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              saving ||
              gaps.length > 0 ||
              !canRecordWithJudge(judgePick ?? form.judge, judges)
            }
            onClick={() => void save(true)}
          >
            {gaps.length > 0
              ? `Mark complete (${gaps.length} remaining)`
              : "Mark complete"}
          </Button>
          {gaps.length > 0 ? (
            <ul className="w-full text-xs text-sss-text-secondary">
              {gaps.map((gap) => (
                <li key={gap.field}>
                  <a className="underline" href={`#se-${gap.sectionId}`}>
                    {gap.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {actionMsg ? (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${
                actionError ? "text-destructive" : "text-sss-accent-deep"
              }`}
            >
              {actionMsg}
            </p>
          ) : (
            <p className="text-xs text-sss-text-muted">
              Mark complete needs dog name, judge, and Pass/Fail.
            </p>
          )}
          {autosaveStatus ? (
            <p className="ml-auto text-xs text-sss-text-muted" role="status">
              {autosaveStatus}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SeSectionObserver({
  sections,
}: {
  sections: { id: string; label: string; filled: number; total: number }[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "identification");
  const sectionKey = sections.map((section) => section.id).join("|");

  useEffect(() => {
    const ids = sectionKey.split("|").filter(Boolean);
    const els = ids
      .map((id) => document.getElementById(`se-${id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.id.replace(/^se-/, "");
        if (id) setActiveId(id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionKey]);

  return <SeStepper sections={sections} activeId={activeId} />;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = `se-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-sss-text-muted">
        {label}
      </Label>
      {cloneElement(children, { id })}
    </div>
  );
}

function Radio({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sss-md border px-3 py-2 text-sm transition-colors",
        checked
          ? "border-sss-accent bg-sss-lifted text-sss-text-primary"
          : "border-sss-border bg-sss-paper text-sss-text-secondary hover:border-sss-accent-soft",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="accent-sss-accent"
      />
      {label}
    </label>
  );
}

function OptionRow<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-sss-border p-3">
      <p className="text-xs font-medium text-sss-text-secondary">{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <Radio
            key={opt}
            name={label}
            checked={value === opt}
            onChange={() => onChange(opt)}
            label={labels[opt]}
          />
        ))}
      </div>
    </div>
  );
}
