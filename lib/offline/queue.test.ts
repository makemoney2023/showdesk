import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";

const { store } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
}));

vi.mock("idb-keyval", () => ({
  get: async (key: string) => store.get(key),
  set: async (key: string, value: unknown) => {
    store.set(key, value);
  },
  del: async (key: string) => {
    store.delete(key);
  },
  keys: async () => [...store.keys()],
}));

import {
  discardOfflineQueueItem,
  enqueueRecording,
  enqueueSeDraft,
  listOfflineQueue,
} from "./queue";
import { readRecoverableSeDraft, writeRecoverableSeDraft } from "./se-draft";

beforeEach(() => {
  store.clear();
});

describe("discardOfflineQueueItem", () => {
  it("removes one recording and leaves the other queued", async () => {
    await enqueueRecording({
      id: "rec-keep",
      entryId: "entry-keep",
      showId: "show-1",
      blob: new Blob(["keep"]),
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    await enqueueRecording({
      id: "rec-drop",
      entryId: "entry-drop",
      showId: "show-1",
      blob: new Blob(["drop"]),
      createdAt: "2026-09-06T12:01:00.000Z",
    });

    await discardOfflineQueueItem({
      id: "rec-drop",
      kind: "recording",
      showId: "show-1",
      entryId: "entry-drop",
    });

    const remaining = await listOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      id: "rec-keep",
      kind: "recording",
    });
  });

  it("removes an SE draft and its recoverable local form", async () => {
    await enqueueSeDraft({
      id: "se-drop",
      entryId: "entry-se",
      showId: "show-1",
      evaluationId: "eval-1",
      form: createEmptyTnrkSeForm(),
      markComplete: false,
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    await writeRecoverableSeDraft({
      showId: "show-1",
      entryId: "entry-se",
      evaluationId: "eval-1",
      form: createEmptyTnrkSeForm(),
      savedAt: "2026-09-06T12:00:00.000Z",
      serverUpdatedAt: "2026-09-06T11:00:00.000Z",
    });

    await discardOfflineQueueItem({
      id: "se-drop",
      kind: "se",
      showId: "show-1",
      entryId: "entry-se",
    });

    expect(await listOfflineQueue()).toEqual([]);
    expect(await readRecoverableSeDraft("show-1", "entry-se")).toBeNull();
  });
});
