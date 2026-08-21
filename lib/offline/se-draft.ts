import { del, get, set } from "idb-keyval";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type { SeEvaluationRecord } from "@/lib/types";

const SE_DRAFT_PREFIX = "sss-se-draft-";

export type RecoverableSeDraft = {
  showId: string;
  entryId: string;
  evaluationId: string;
  form: TnrkSeForm;
  savedAt: string;
  serverUpdatedAt: string;
};

function draftKey(showId: string, entryId: string): string {
  return `${SE_DRAFT_PREFIX}${showId}-${entryId}`;
}

export function seFormFingerprint(form: TnrkSeForm): string {
  return JSON.stringify(form);
}

export function shouldRestoreSeDraft(
  draft: RecoverableSeDraft,
  evaluation: SeEvaluationRecord,
): boolean {
  return (
    draft.showId === evaluation.show_id &&
    draft.entryId === evaluation.entry_id &&
    draft.evaluationId === evaluation.id &&
    Date.parse(draft.savedAt) > Date.parse(evaluation.updated_at)
  );
}

export async function readRecoverableSeDraft(
  showId: string,
  entryId: string,
): Promise<RecoverableSeDraft | null> {
  try {
    return (await get<RecoverableSeDraft>(draftKey(showId, entryId))) ?? null;
  } catch {
    return null;
  }
}

export async function writeRecoverableSeDraft(
  draft: RecoverableSeDraft,
): Promise<void> {
  await set(draftKey(draft.showId, draft.entryId), draft);
}

export async function clearRecoverableSeDraft(
  showId: string,
  entryId: string,
): Promise<void> {
  try {
    await del(draftKey(showId, entryId));
  } catch {
    // Saving to the desk still succeeded; stale local recovery is non-fatal.
  }
}
