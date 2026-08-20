import { get, set, del, keys } from "idb-keyval";

const QUEUE_PREFIX = "sss-offline-";

export interface OfflineRecording {
  id: string;
  entryId: string;
  showId: string;
  blob: Blob;
  createdAt: string;
  judge?: string;
  liveTranscript?: string;
}

function queueKey(id: string) {
  return `${QUEUE_PREFIX}${id}`;
}

export async function enqueueRecording(
  recording: OfflineRecording,
): Promise<void> {
  await set(queueKey(recording.id), recording);
}

export async function listQueuedRecordings(): Promise<OfflineRecording[]> {
  const allKeys = await keys();
  const queueKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(QUEUE_PREFIX),
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

export async function clearOfflineQueue(): Promise<void> {
  const allKeys = await keys();
  for (const key of allKeys) {
    if (typeof key === "string" && key.startsWith(QUEUE_PREFIX)) {
      await del(key);
    }
  }
}
