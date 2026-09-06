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
  /** Transient failures (offline, 5xx) — stay queued for the next sync. */
  failed: number;
  /** Permanent server rejections — removed so the queue can drain. */
  conflicts: number;
  /** True when the desk session expired (401) — sign in, then sync again. */
  unauthorized: boolean;
  remaining: number;
}

export type SyncOutcome = "synced" | "retry" | "conflict" | "unauthorized";

/**
 * Ring Wi-Fi drops mid-show, so the queue must drain itself:
 * - 401: session expired — keep the item, tell the steward to sign in.
 * - 404/409: the server state supersedes the queued item (entry deleted or
 *   critique approved elsewhere) — retrying forever poisons the queue.
 * - Other non-ok (5xx, network): transient — retry on the next sync.
 */
export function classifySyncResponse(status: number | null): SyncOutcome {
  if (status === null) return "retry";
  if (status >= 200 && status < 300) return "synced";
  if (status === 401) return "unauthorized";
  if (status === 404 || status === 409) return "conflict";
  return "retry";
}

async function syncRecordings(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
  unauthorized: boolean;
}> {
  const items = await listQueuedRecordings();
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  let unauthorized = false;
  for (const item of items) {
    let status: number | null = null;
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
      status = res.status;
    } catch {
      status = null;
    }
    const outcome = classifySyncResponse(status);
    if (outcome === "synced") {
      await removeQueuedRecording(item.id);
      synced += 1;
    } else if (outcome === "conflict") {
      await removeQueuedRecording(item.id);
      conflicts += 1;
    } else if (outcome === "unauthorized") {
      unauthorized = true;
      failed += 1;
    } else {
      failed += 1;
    }
  }
  return { synced, failed, conflicts, unauthorized };
}

async function patchSeDraft(input: {
  showId: string;
  evaluationId: string;
  form: unknown;
  markComplete: boolean;
}): Promise<number | null> {
  try {
    const res = await fetch("/api/evaluations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: input.showId,
        evaluation_id: input.evaluationId,
        form: input.form,
        mark_complete: input.markComplete,
      }),
    });
    return res.status;
  } catch {
    return null;
  }
}

async function syncSeDrafts(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
  unauthorized: boolean;
}> {
  const items = await listQueuedSeDrafts();
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  let unauthorized = false;
  for (const item of items) {
    let status = await patchSeDraft({
      showId: item.showId,
      evaluationId: item.evaluationId,
      form: item.form,
      markComplete: item.markComplete,
    });
    // "Mark complete" can fail validation once the server has newer rules.
    // The steward's field data must still land — save it as a draft instead
    // of retrying a doomed completion forever.
    if (status === 400 && item.markComplete) {
      status = await patchSeDraft({
        showId: item.showId,
        evaluationId: item.evaluationId,
        form: item.form,
        markComplete: false,
      });
    }
    const outcome = classifySyncResponse(status);
    if (outcome === "synced") {
      await removeQueuedSeDraft(item.id);
      await clearRecoverableSeDraft(item.showId, item.entryId);
      synced += 1;
    } else if (outcome === "conflict") {
      await removeQueuedSeDraft(item.id);
      conflicts += 1;
    } else if (outcome === "unauthorized") {
      unauthorized = true;
      failed += 1;
    } else {
      failed += 1;
    }
  }
  return { synced, failed, conflicts, unauthorized };
}

/** Upload queued recordings and SE drafts; keep transient failures in IndexedDB. */
export async function syncOfflineQueue(): Promise<QueueSyncResult> {
  const recordings = await syncRecordings();
  const seDrafts = await syncSeDrafts();
  const remaining =
    (await listQueuedRecordings()).length + (await listQueuedSeDrafts()).length;
  return {
    synced: recordings.synced + seDrafts.synced,
    failed: recordings.failed + seDrafts.failed,
    conflicts: recordings.conflicts + seDrafts.conflicts,
    unauthorized: recordings.unauthorized || seDrafts.unauthorized,
    remaining,
  };
}

/** @deprecated Use syncOfflineQueue — kept for existing ringside callers. */
export const syncQueuedRecordings = syncOfflineQueue;

export function formatQueueSyncStatus(result: QueueSyncResult): string {
  if (
    result.synced === 0 &&
    result.failed === 0 &&
    result.conflicts === 0
  ) {
    return "Nothing to sync";
  }
  const parts: string[] = [];
  if (result.synced > 0) {
    parts.push(`Synced ${result.synced} item${result.synced === 1 ? "" : "s"}`);
  }
  if (result.conflicts > 0) {
    parts.push(
      `${result.conflicts} removed (already approved or entry deleted)`,
    );
  }
  if (result.failed > 0) {
    parts.push(
      result.unauthorized
        ? `${result.failed} waiting — session expired, sign in and sync again`
        : `${result.failed} couldn't upload — tap Sync to retry`,
    );
  }
  return parts.join(" · ");
}
