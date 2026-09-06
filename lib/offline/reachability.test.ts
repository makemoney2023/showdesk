import { afterEach, describe, expect, it, vi } from "vitest";
import { probeDeskReachable, shouldTreatAsOffline } from "./reachability";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("probeDeskReachable", () => {
  it("is true when the desk health check returns ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
    await expect(probeDeskReachable()).resolves.toBe(true);
  });

  it("is false when fetch throws or the desk is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(probeDeskReachable()).resolves.toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(probeDeskReachable()).resolves.toBe(false);
  });
});

describe("shouldTreatAsOffline", () => {
  it("trusts a live connection without probing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", fetchMock);
    await expect(shouldTreatAsOffline()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not queue just because the browser fired a false offline event", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await expect(shouldTreatAsOffline()).resolves.toBe(false);
  });

  it("is offline only when the browser says so and the desk probe fails", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(shouldTreatAsOffline()).resolves.toBe(true);
  });
});
