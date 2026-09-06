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
  evaluationFromQueuedSeDraft,
  listOfflineQueue,
  queuedSeDraftForEntry,
  rosterEntryFromQueuedSeDraft,
  updateQueuedRecordingTranscript,
} from "./queue";
import { readRecoverableSeDraft, writeRecoverableSeDraft } from "./se-draft";

beforeEach(() => {
  store.clear();
});

describe("updateQueuedRecordingTranscript", () => {
  it("rewrites the live transcript on a queued recording", async () => {
    await enqueueRecording({
      id: "rec-edit",
      entryId: "entry-1",
      showId: "show-1",
      blob: new Blob(["audio"]),
      createdAt: "2026-09-06T12:00:00.000Z",
      liveTranscript: "Original letter",
    });
    expect(await updateQueuedRecordingTranscript("rec-edit", "Edited letter")).toBe(
      true,
    );
    const remaining = await listOfflineQueue();
    expect(remaining[0]).toMatchObject({
      id: "rec-edit",
      liveTranscript: "Edited letter",
    });
  });
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

describe("queuedSeDraftForEntry", () => {
  it("returns the latest queued SE for that dog", async () => {
    const older = createEmptyTnrkSeForm();
    older.comments = "first";
    const newer = createEmptyTnrkSeForm();
    newer.comments = "second";
    await enqueueSeDraft({
      id: "se-old",
      entryId: "entry-se",
      showId: "show-1",
      evaluationId: "eval-1",
      form: older,
      markComplete: false,
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    await enqueueSeDraft({
      id: "se-new",
      entryId: "entry-se",
      showId: "show-1",
      evaluationId: "eval-1",
      form: newer,
      markComplete: false,
      createdAt: "2026-09-06T12:05:00.000Z",
    });

    const found = await queuedSeDraftForEntry("show-1", "entry-se");
    expect(found?.id).toBe("se-new");
    expect(found?.form.comments).toBe("second");
    expect(await queuedSeDraftForEntry(null, "entry-se")).toMatchObject({
      id: "se-new",
    });
    expect(await queuedSeDraftForEntry("show-1", "other")).toBeNull();
  });
});

describe("evaluationFromQueuedSeDraft", () => {
  it("rebuilds a draft evaluation the SE page can edit", () => {
    const form = createEmptyTnrkSeForm();
    form.dog_name = "Rex";
    const evaluation = evaluationFromQueuedSeDraft({
      id: "se-1",
      entryId: "entry-se",
      showId: "show-1",
      evaluationId: "eval-1",
      form,
      markComplete: false,
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    expect(evaluation).toMatchObject({
      id: "eval-1",
      show_id: "show-1",
      entry_id: "entry-se",
      status: "draft",
      form,
    });
  });
});

describe("rosterEntryFromQueuedSeDraft", () => {
  it("uses the queued dog name so the form can reopen offline", () => {
    const form = createEmptyTnrkSeForm();
    form.dog_name = "Rex Queue Review";
    form.sex = "male";
    const entry = rosterEntryFromQueuedSeDraft({
      id: "se-1",
      entryId: "entry-se",
      showId: "show-1",
      evaluationId: "eval-1",
      form,
      markComplete: false,
      createdAt: "2026-09-06T12:00:00.000Z",
    });
    expect(entry).toMatchObject({
      id: "entry-se",
      show_id: "show-1",
      dog_name: "Rex Queue Review",
      sex: "R",
    });
  });
});
