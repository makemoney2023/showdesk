import { clearRecoverableSeDraft } from "./se-draft";
import {
  listQueuedRecordings,
  listQueuedSeDrafts,
  removeQueuedRecording,
  removeQueuedSeDraft,
} from "./queue";

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface QueueSyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

async function syncRecordings(): Promise<{ synced: number; failed: number }> {
  const items = await listQueuedRecordings();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const audioBase64 = await blobToBase64(item.blob);
      const res = await fetch("/api/critiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: item.showId,
          entry_id: item.entryId,
          audio_base64: audioBase64,
          live_transcript: item.liveTranscript || undefined,
          judge: item.judge,
        }),
      });
      if (res.ok) {
        await removeQueuedRecording(item.id);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}

async function syncSeDrafts(): Promise<{ synced: number; failed: number }> {
  const items = await listQueuedSeDrafts();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const res = await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: item.showId,
          evaluation_id: item.evaluationId,
          form: item.form,
          mark_complete: item.markComplete,
        }),
      });
      if (res.ok) {
        await removeQueuedSeDraft(item.id);
        await clearRecoverableSeDraft(item.showId, item.entryId);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}

/** Upload queued recordings and SE drafts; keep failures in IndexedDB. */
export async function syncOfflineQueue(): Promise<QueueSyncResult> {
  const recordings = await syncRecordings();
  const seDrafts = await syncSeDrafts();
  const remaining =
    (await listQueuedRecordings()).length + (await listQueuedSeDrafts()).length;
  return {
    synced: recordings.synced + seDrafts.synced,
    failed: recordings.failed + seDrafts.failed,
    remaining,
  };
}

/** @deprecated Use syncOfflineQueue — kept for existing ringside callers. */
export const syncQueuedRecordings = syncOfflineQueue;

export function formatQueueSyncStatus(result: QueueSyncResult): string {
  if (result.synced === 0 && result.failed === 0) {
    return "Nothing to sync";
  }
  if (result.failed === 0) {
    return `Synced ${result.synced} item${result.synced === 1 ? "" : "s"}`;
  }
  return `Synced ${result.synced}, ${result.failed} failed — retry when online`;
}
