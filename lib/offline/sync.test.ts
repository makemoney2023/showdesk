import { describe, expect, it } from "vitest";
import { formatQueueSyncStatus } from "./sync";

describe("formatQueueSyncStatus", () => {
  it("describes empty, success, and partial failure", () => {
    expect(
      formatQueueSyncStatus({ synced: 0, failed: 0, remaining: 0 }),
    ).toBe("Nothing to sync");
    expect(
      formatQueueSyncStatus({ synced: 1, failed: 0, remaining: 0 }),
    ).toBe("Synced 1 recording");
    expect(
      formatQueueSyncStatus({ synced: 2, failed: 1, remaining: 1 }),
    ).toBe("Synced 2, 1 failed — retry when online");
  });
});
