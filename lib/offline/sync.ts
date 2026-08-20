import {
  listQueuedRecordings,
  removeQueuedRecording,
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

/** Upload queued recordings; keep failures in IndexedDB. */
export async function syncQueuedRecordings(): Promise<QueueSyncResult> {
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
  const remaining = (await listQueuedRecordings()).length;
  return { synced, failed, remaining };
}

export function formatQueueSyncStatus(result: QueueSyncResult): string {
  if (result.synced === 0 && result.failed === 0) {
    return "Nothing to sync";
  }
  if (result.failed === 0) {
    return `Synced ${result.synced} recording${result.synced === 1 ? "" : "s"}`;
  }
  return `Synced ${result.synced}, ${result.failed} failed — retry when online`;
}
