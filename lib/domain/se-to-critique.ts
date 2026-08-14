import { createEmptyDraft, type DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
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
  draft.draftAssist = {
    note: SE_SYNC_NOTE,
    se_result: form.final_result ?? "",
    se_judge: form.judge,
  };
  return draft;
}

/**
 * Merge SE into an existing critique draft.
 * - Empty / prior SE-only drafts are replaced
 * - Audio/secretary narratives keep their text and get an updated SE section appended
 */
export function mergeSeIntoCritiqueDraft(
  existing: DraftCritiqueSchema | undefined,
  form: TnrkSeForm,
): DraftCritiqueSchema {
  const fromSe = critiqueDraftFromSeForm(form);
  if (!fromSe.narrative.trim()) {
    return existing ?? fromSe;
  }
  if (!existing?.narrative.trim()) return fromSe;

  const note = existing.draftAssist?.note ?? "";
  if (note.includes("SE form")) return fromSe;

  const withoutOldSe = existing.narrative.split(SE_SECTION)[0]?.trim() ?? "";
  return {
    ...existing,
    narrative: `${withoutOldSe}\n\n${SE_SECTION}\n${fromSe.narrative}`.trim(),
    draftAssist: {
      ...existing.draftAssist,
      se_sync: SE_SYNC_NOTE,
      se_result: form.final_result ?? "",
      se_judge: form.judge,
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
