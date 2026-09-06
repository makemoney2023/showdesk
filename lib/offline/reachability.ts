/** Show Wi-Fi often fails the browser's captive-portal check while the desk still works. */

const DEFAULT_PROBE_MS = 2500;

export async function probeDeskReachable(
  timeoutMs = DEFAULT_PROBE_MS,
): Promise<boolean> {
  if (typeof fetch !== "function") return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/health", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Only treat the device as offline after a same-origin probe fails. */
export async function shouldTreatAsOffline(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (navigator.onLine) return false;
  return !(await probeDeskReachable());
}
