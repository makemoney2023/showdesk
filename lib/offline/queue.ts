import { get, set, del, keys } from "idb-keyval";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type { SeEvaluationRecord } from "@/lib/types";
import { clearRecoverableSeDraft } from "./se-draft";

const QUEUE_PREFIX = "sss-offline-";
const SE_QUEUE_PREFIX = "sss-offline-se-";

export interface OfflineRecording {
  id: string;
  entryId: string;
  showId: string;
  blob: Blob;
  createdAt: string;
  judge?: string;
  liveTranscript?: string;
}

export interface OfflineSeDraft {
  id: string;
  entryId: string;
  showId: string;
  evaluationId: string;
  form: TnrkSeForm;
  markComplete: boolean;
  createdAt: string;
}

export type OfflineQueueKind = "recording" | "se";

export type OfflineQueueItem =
  | (OfflineRecording & { kind: "recording" })
  | (OfflineSeDraft & { kind: "se" });

function queueKey(id: string) {
  return `${QUEUE_PREFIX}${id}`;
}

function seQueueKey(id: string) {
  return `${SE_QUEUE_PREFIX}${id}`;
}

export async function enqueueRecording(
  recording: OfflineRecording,
): Promise<void> {
  await set(queueKey(recording.id), recording);
}

export async function listQueuedRecordings(): Promise<OfflineRecording[]> {
  const allKeys = await keys();
  const queueKeys = allKeys.filter(
    (k) =>
      typeof k === "string" &&
      k.startsWith(QUEUE_PREFIX) &&
      !k.startsWith(SE_QUEUE_PREFIX),
  ) as string[];
  const items: OfflineRecording[] = [];
  for (const key of queueKeys) {
    const item = await get<OfflineRecording>(key);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedRecording(id: string): Promise<void> {
  await del(queueKey(id));
}

export async function enqueueSeDraft(draft: OfflineSeDraft): Promise<void> {
  const existing = await listQueuedSeDrafts();
  for (const prev of existing) {
    if (prev.evaluationId === draft.evaluationId) {
      await removeQueuedSeDraft(prev.id);
    }
  }
  await set(seQueueKey(draft.id), draft);
}

export async function listQueuedSeDrafts(): Promise<OfflineSeDraft[]> {
  const allKeys = await keys();
  const queueKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(SE_QUEUE_PREFIX),
  ) as string[];
  const items: OfflineSeDraft[] = [];
  for (const key of queueKeys) {
    const item = await get<OfflineSeDraft>(key);
    if (item) items.push(item);
  }
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Latest queued SE draft for this show dog, if the steward is editing it again. */
export async function queuedSeDraftForEntry(
  showId: string,
  entryId: string,
): Promise<OfflineSeDraft | null> {
  const drafts = await listQueuedSeDrafts();
  const matches = drafts.filter(
    (draft) => draft.showId === showId && draft.entryId === entryId,
  );
  return matches[matches.length - 1] ?? null;
}

/** Reopen a queued SE on this device when the desk create call cannot run. */
export function evaluationFromQueuedSeDraft(
  draft: OfflineSeDraft,
): SeEvaluationRecord {
  return {
    id: draft.evaluationId,
    show_id: draft.showId,
    entry_id: draft.entryId,
    form: draft.form,
    status: draft.markComplete ? "complete" : "draft",
    created_at: draft.createdAt,
    updated_at: draft.createdAt,
  };
}

export async function removeQueuedSeDraft(id: string): Promise<void> {
  await del(seQueueKey(id));
}

/** Drop one queued item from this device so it will not upload. */
export async function discardOfflineQueueItem(
  item: Pick<OfflineQueueItem, "id" | "kind" | "showId" | "entryId">,
): Promise<void> {
  if (item.kind === "se") {
    await removeQueuedSeDraft(item.id);
    await clearRecoverableSeDraft(item.showId, item.entryId);
    return;
  }
  await removeQueuedRecording(item.id);
}

export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  const [recordings, seDrafts] = await Promise.all([
    listQueuedRecordings(),
    listQueuedSeDrafts(),
  ]);
  return [
    ...recordings.map((item) => ({ ...item, kind: "recording" as const })),
    ...seDrafts.map((item) => ({ ...item, kind: "se" as const })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function clearOfflineQueue(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (
      typeof key === "string" &&
      (key.startsWith(SE_QUEUE_PREFIX) || key.startsWith(QUEUE_PREFIX))
    ) {
      await del(key);
    }
  }
}
