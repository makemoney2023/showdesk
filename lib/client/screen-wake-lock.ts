"use client";

export type ScreenWakeLock = {
  release: () => Promise<void>;
  addEventListener?: (
    type: "release",
    listener: () => void,
    options?: { once?: boolean },
  ) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLock>;
  };
};

export async function requestScreenWakeLock(): Promise<ScreenWakeLock | null> {
  const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
  if (!wakeLock || document.visibilityState !== "visible") return null;
  try {
    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(
  lock: ScreenWakeLock | null,
): Promise<void> {
  if (!lock) return;
  try {
    await lock.release();
  } catch {
    // It may already have been released by the browser.
  }
}
