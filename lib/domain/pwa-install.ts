export const PWA_DISMISS_KEY = "sss-pwa-install-dismissed";
export const PWA_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export type PwaInstallKind = "native" | "ios" | "manual";

export function isStandaloneDisplay(input: {
  displayModeStandalone: boolean;
  iosStandalone?: boolean;
}): boolean {
  return Boolean(input.displayModeStandalone || input.iosStandalone);
}

export function pwaInstallKind(input: {
  userAgent: string;
  maxTouchPoints?: number;
  canPrompt: boolean;
}): PwaInstallKind {
  if (input.canPrompt) return "native";
  const ua = input.userAgent;
  const iPhone = /iPhone|iPod/i.test(ua);
  const iPad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && (input.maxTouchPoints ?? 0) > 1);
  if ((iPhone || iPad) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) {
    return "ios";
  }
  return "manual";
}

export function shouldOfferPwaInstall(input: {
  standalone: boolean;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.standalone) return false;
  if (input.dismissedAt == null) return true;
  return input.now - input.dismissedAt >= PWA_DISMISS_MS;
}
