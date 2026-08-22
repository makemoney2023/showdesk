"use client";

import {
  PWA_DISMISS_KEY,
  isStandaloneDisplay,
} from "@/lib/domain/pwa-install";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function readPwaDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePwaDismissedAt(now = Date.now()) {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(now));
  } catch {
    /* private mode / quota */
  }
}

export function clearPwaDismissedAt() {
  try {
    localStorage.removeItem(PWA_DISMISS_KEY);
  } catch {
    /* private mode / quota */
  }
}

export function currentStandaloneDisplay(): boolean {
  const displayModeStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isStandaloneDisplay({ displayModeStandalone, iosStandalone });
}

export async function registerShowDeskServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    /* unsupported or blocked */
  }
}
