import { createEmptyDraft, type DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import {
  critiquesForEntry,
  openCritiqueForEntry,
} from "@/lib/domain/entry-cascade";
import { entriesForDog } from "@/lib/domain/dog-identity";
import { seFormFormwert, type TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type { CritiqueRecord } from "@/lib/types";

export const SE_SYNC_NOTE = "Synced from ringside SE form";
const SE_SECTION = "— SE form —";

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
function applySeFormwert(
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

/**
 * Copy ringside SE fields into the dog's open critique.
 * Never creates a second queue item after a certificate is approved —
 * recall first if the SE form should update that draft.
 */
/** Copy SE narrative onto this appearance and every conformation sibling. */
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
  },
): CritiqueRecord[] {
  const seEntry = entries.find(
    (entry) => entry.id === seEntryId && entry.show_id === showId,
  );
  const targets = [
    seEntryId,
    ...(seEntry ? conformationSiblingIds(entries, seEntry) : []),
  ];
  return targets.reduce(
    (next, entryId) =>
      syncSeIntoCritiques(next, showId, entryId, form, options),
    critiques,
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
