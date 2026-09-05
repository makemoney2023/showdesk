import { createEmptyDraft, type DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import {
  critiquesForEntry,
  openCritiqueForEntry,
} from "@/lib/domain/entry-cascade";
import { entriesForDog } from "@/lib/domain/dog-identity";
import {
  seFormFormwert,
  seFormHasPrintableOverlay,
  type TnrkSeForm,
} from "@/lib/domain/tnrk-se-form";
import type { CritiqueRecord } from "@/lib/types";

export const SE_SYNC_NOTE = "Synced from ringside SE form";
export const SE_SECTION = "— SE form —";

/** Draft body was replaced by the ringside SE form (not spoken STT). */
export function isSeFormReplacementDraft(
  draft: { draftAssist?: { note?: string } } | null | undefined,
): boolean {
  return (draft?.draftAssist?.note ?? "").includes("SE form");
}

/** Spoken / STT text — never the "Ringside SE form" stub. */
export function spokenCritiqueTranscript(
  critique: Pick<CritiqueRecord, "transcript"> | null | undefined,
): string {
  const spoken = critique?.transcript?.trim() ?? "";
  if (!spoken || spoken.startsWith("Ringside SE")) return "";
  return spoken;
}

/** Drop the appended SE block; keep secretary-edited STT above it. */
export function critiqueLetterWithoutSeSection(narrative: string): string {
  return narrative.split(SE_SECTION)[0]?.trim() ?? "";
}

/**
 * Critique certificate / public Richterbericht: spoken STT or a
 * secretary-edited STT letter only. SE appearance, comments, and ratings
 * stay on the Standard Evaluation certificate.
 */
export function critiqueLetterForCertificate(
  critique:
    | Pick<CritiqueRecord, "transcript" | "draft">
    | null
    | undefined,
): string {
  if (!critique) return "";
  const spoken = spokenCritiqueTranscript(critique);
  if (isSeFormReplacementDraft(critique.draft)) return spoken;
  return (
    critiqueLetterWithoutSeSection(critique.draft.narrative) || spoken
  );
}

/** Build narrative text from steward SE fields. */
export function narrativeFromSeForm(form: TnrkSeForm): string {
  const parts: string[] = [];

  if (form.overall_appearance.trim()) {
    parts.push(form.overall_appearance.trim());
  }
  if (form.comments.trim()) {
    parts.push(form.comments.trim());
  }

  const ratings: string[] = [];
  if (form.head_shape) ratings.push(`Head: ${form.head_shape}`);
  if (form.cheek_bone) ratings.push(`Cheek bone: ${form.cheek_bone}`);
  if (form.bone_strength) ratings.push(`Bone: ${form.bone_strength}`);
  if (form.general_behavior) ratings.push(`Behavior: ${form.general_behavior}`);
  if (form.gunfire) ratings.push(`Gunfire: ${form.gunfire}`);
  if (form.bite) {
    ratings.push(
      form.bite === "other" && form.bite_other.trim()
        ? `Bite: ${form.bite_other.trim()}`
        : `Bite: ${form.bite}`,
    );
  }
  if (form.final_result) {
    ratings.push(`SE result: ${form.final_result.toUpperCase()}`);
  }
  if (ratings.length) parts.push(ratings.join(". ") + ".");

  return parts.join("\n\n").trim();
}

/** Build a reviewable critique draft from SE fields only. */
export function critiqueDraftFromSeForm(form: TnrkSeForm): DraftCritiqueSchema {
  const draft = createEmptyDraft();
  draft.narrative = narrativeFromSeForm(form);
  draft.formwert = seFormFormwert(form);
  draft.draftAssist = {
    note: SE_SYNC_NOTE,
    se_result: form.final_result ?? "",
    se_judge: form.judge,
    se_formwert: seFormFormwert(form) ?? "",
  };
  return draft;
}

/**
 * Merge SE into an existing critique draft.
 * - Empty / prior SE-only drafts are replaced
 * - Audio/secretary narratives keep their text and get an updated SE section appended
 */
export function applySeFormwert(
  draft: DraftCritiqueSchema,
  form: TnrkSeForm,
): DraftCritiqueSchema {
  const formwert = seFormFormwert(form) ?? draft.formwert;
  return {
    ...draft,
    formwert,
    draftAssist: {
      ...draft.draftAssist,
      se_formwert: seFormFormwert(form) ?? "",
    },
  };
}

export function mergeSeIntoCritiqueDraft(
  existing: DraftCritiqueSchema | undefined,
  form: TnrkSeForm,
): DraftCritiqueSchema {
  const fromSe = critiqueDraftFromSeForm(form);
  if (!fromSe.narrative.trim()) {
    return applySeFormwert(existing ?? fromSe, form);
  }
  if (!existing?.narrative.trim()) return fromSe;

  const note = existing.draftAssist?.note ?? "";
  if (note.includes("SE form")) return fromSe;

  const withoutOldSe = existing.narrative.split(SE_SECTION)[0]?.trim() ?? "";
  return {
    ...existing,
    narrative: `${withoutOldSe}\n\n${SE_SECTION}\n${fromSe.narrative}`.trim(),
    formwert: fromSe.formwert ?? existing.formwert,
    draftAssist: {
      ...existing.draftAssist,
      se_sync: SE_SYNC_NOTE,
      se_result: form.final_result ?? "",
      se_judge: form.judge,
      se_formwert: fromSe.formwert ?? "",
    },
  };
}

/** Approved/released critiques must not be mutated by SE sync. */
export function canSyncSeIntoCritique(
  critique: CritiqueRecord | undefined,
): boolean {
  if (!critique) return true;
  if (critique.status === "APPROVED") {
    return false;
  }
  return true;
}

export function isUnusedSeCloneCritique(
  critique: Pick<
    CritiqueRecord,
    "audio_path" | "status" | "transcript" | "draft"
  >,
): boolean {
  if (critique.audio_path) return false;
  if (critique.status === "APPROVED") return false;
  if (!critique.transcript.startsWith("Ringside SE")) return false;
  const note = critique.draft.draftAssist?.note ?? "";
  return note.includes("SE form") || Boolean(critique.draft.draftAssist?.se_sync);
}

/**
 * Review / desk counts hide unused SE clones on Saturday/Sunday when the
 * same dog already has an SE-entry critique. Real audio critiques stay.
 */
export function seEvaluationForEntry<
  TEvaluation extends {
    entry_id: string;
    form?: unknown;
    status?: string;
    updated_at?: string;
  },
  TEntry extends {
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
  },
>(
  evaluations: TEvaluation[],
  entries: TEntry[],
  entry: TEntry | undefined,
): TEvaluation | undefined {
  if (!entry) return undefined;
  const dogEntries = entriesForDog(entries, entry);
  const ids = new Set(dogEntries.map((item) => item.id));
  const matches = evaluations.filter((evaluation) => ids.has(evaluation.entry_id));
  if (matches.length <= 1) return matches[0];

  const seEntryIds = new Set(
    dogEntries
      .filter((item) => item.event_kind === "se")
      .map((item) => item.id),
  );

  const score = (evaluation: TEvaluation) => {
    const filled = seFormHasPrintableOverlay(evaluation.form);
    const onSeEntry = seEntryIds.has(evaluation.entry_id);
    const exact = evaluation.entry_id === entry.id;
    const complete = evaluation.status === "complete";
    return (
      (filled ? 8 : 0) +
      (onSeEntry ? 4 : 0) +
      (exact ? 2 : 0) +
      (complete ? 1 : 0)
    );
  };

  return [...matches].sort((a, b) => {
    const delta = score(b) - score(a);
    if (delta !== 0) return delta;
    return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  })[0];
}

export function visibleReviewCritiques<
  TCritique extends Pick<
    CritiqueRecord,
    "id" | "show_id" | "entry_id" | "audio_path" | "status" | "transcript" | "draft"
  >,
  TEntry extends {
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
  },
>(critiques: TCritique[], entries: TEntry[]): TCritique[] {
  return critiques.filter((critique) => {
    const entry = entries.find((item) => item.id === critique.entry_id);
    if (!entry || entry.event_kind === "se") return true;
    if (!isUnusedSeCloneCritique(critique)) return true;
    const seEntry = entriesForDog(entries, entry).find(
      (item) => item.event_kind === "se",
    );
    if (!seEntry) return true;
    return !critiques.some((other) => other.entry_id === seEntry.id);
  });
}

/**
 * Copy ringside SE fields into the dog's open critique.
 * Never creates a second queue item after a certificate is approved —
 * recall first if the SE form should update that draft.
 */
/** Copy SE notes onto existing conformation critiques; never spawn extras. */
export function conformationSiblingIds<
  T extends {
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
  },
>(entries: T[], seEntry: T): string[] {
  return entriesForDog(entries, seEntry)
    .filter(
      (entry) =>
        entry.id !== seEntry.id && entry.event_kind === "conformation",
    )
    .map((entry) => entry.id);
}

export function syncSeIntoDogCritiques(
  critiques: CritiqueRecord[],
  entries: Array<{
    id: string;
    show_id: string;
    dog_id?: string;
    zb_number?: string;
    microchip?: string;
    event_kind?: "se" | "conformation";
  }>,
  showId: string,
  seEntryId: string,
  form: TnrkSeForm,
  options: {
    force: boolean;
    newId: () => string;
    now?: string;
    createIfMissing?: boolean;
  },
): CritiqueRecord[] {
  const seEntry = entries.find(
    (entry) => entry.id === seEntryId && entry.show_id === showId,
  );
  const siblingIds = seEntry
    ? conformationSiblingIds(entries, seEntry)
    : [];
  const withoutUnusedClones = critiques.filter((critique) => {
    if (!siblingIds.includes(critique.entry_id)) return true;
    return !isUnusedSeCloneCritique(critique);
  });
  const targets = [seEntryId, ...siblingIds];
  return targets.reduce(
    (next, entryId) =>
      syncSeIntoCritiques(next, showId, entryId, form, {
        ...options,
        createIfMissing: entryId === seEntryId,
      }),
    withoutUnusedClones,
  );
}

export function syncSeIntoCritiques(
  critiques: CritiqueRecord[],
  showId: string,
  entryId: string,
  form: TnrkSeForm,
  options: {
    force: boolean;
    newId: () => string;
    now?: string;
    createIfMissing?: boolean;
  },
): CritiqueRecord[] {
  const existing = openCritiqueForEntry(critiques, entryId, showId);
  const approved = critiquesForEntry(critiques, entryId, showId).find(
    (critique) => critique.status === "APPROVED",
  );
  if (!canSyncSeIntoCritique(existing ?? approved)) {
    return critiques;
  }

  const seText = narrativeFromSeForm(form);
  const seRating = seFormFormwert(form);
  // Skip empty stubs until steward typed something, set a rating, or completed.
  if (!seText.trim() && !seRating && !options.force) return critiques;

  const draft = existing
    ? mergeSeIntoCritiqueDraft(existing.draft, form)
    : critiqueDraftFromSeForm(form);

  const now = options.now ?? new Date().toISOString();
  if (!existing) {
    if (options.createIfMissing === false) return critiques;
    const created: CritiqueRecord = {
      id: options.newId(),
      show_id: showId,
      entry_id: entryId,
      status: "PENDING_REVIEW",
      transcript: "Ringside SE form",
      draft,
      delivery_status: "pending",
      created_at: now,
      updated_at: now,
    };
    return [...critiques, created];
  }

  return critiques.map((critique) =>
    critique.id === existing.id
      ? {
          ...critique,
          draft,
          transcript:
            critique.transcript && !critique.transcript.startsWith("Ringside SE")
              ? critique.transcript
              : "Ringside SE form",
          status: critique.status === "ERROR" ? "PENDING_REVIEW" : critique.status,
          updated_at: now,
        }
      : critique,
  );
}
