import { describe, expect, it } from "vitest";
import { classifySyncResponse, formatQueueSyncStatus } from "./sync";

describe("classifySyncResponse", () => {
  it("drains permanent rejections instead of retrying forever", () => {
    expect(classifySyncResponse(200)).toBe("synced");
    expect(classifySyncResponse(201)).toBe("synced");
    expect(classifySyncResponse(404)).toBe("conflict");
    expect(classifySyncResponse(409)).toBe("conflict");
  });

  it("keeps transient and auth failures queued", () => {
    expect(classifySyncResponse(null)).toBe("retry");
    expect(classifySyncResponse(500)).toBe("retry");
    expect(classifySyncResponse(502)).toBe("retry");
    expect(classifySyncResponse(413)).toBe("retry");
    expect(classifySyncResponse(400)).toBe("retry");
    expect(classifySyncResponse(401)).toBe("unauthorized");
  });
});

describe("formatQueueSyncStatus", () => {
  it("describes empty, success, and partial failure", () => {
    expect(
      formatQueueSyncStatus({
        synced: 0,
        failed: 0,
        conflicts: 0,
        unauthorized: false,
        remaining: 0,
      }),
    ).toBe("Nothing to sync");
    expect(
      formatQueueSyncStatus({
        synced: 1,
        failed: 0,
        conflicts: 0,
        unauthorized: false,
        remaining: 0,
      }),
    ).toBe("Synced 1 item");
    expect(
      formatQueueSyncStatus({
        synced: 2,
        failed: 1,
        conflicts: 0,
        unauthorized: false,
        remaining: 1,
      }),
    ).toBe("Synced 2 items · 1 couldn't upload — tap Sync to retry");
  });

  it("explains conflicts and expired sessions", () => {
    expect(
      formatQueueSyncStatus({
        synced: 1,
        failed: 0,
        conflicts: 2,
        unauthorized: false,
        remaining: 0,
      }),
    ).toBe("Synced 1 item · 2 removed (already approved or entry deleted)");
    expect(
      formatQueueSyncStatus({
        synced: 0,
        failed: 1,
        conflicts: 0,
        unauthorized: true,
        remaining: 1,
      }),
    ).toBe("1 waiting — session expired, sign in and sync again");
  });
});
