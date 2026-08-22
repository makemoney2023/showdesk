import { describe, expect, it } from "vitest";
import {
  PWA_DISMISS_MS,
  isStandaloneDisplay,
  pwaInstallKind,
  shouldOfferPwaInstall,
} from "./pwa-install";

describe("pwa install offer", () => {
  it("never offers the banner in an installed standalone window", () => {
    expect(
      isStandaloneDisplay({
        displayModeStandalone: true,
        iosStandalone: false,
      }),
    ).toBe(true);
    expect(
      shouldOfferPwaInstall({
        standalone: true,
        dismissedAt: null,
        now: 0,
      }),
    ).toBe(false);
  });

  it("hides a dismissed banner until the reminder window elapses", () => {
    expect(
      shouldOfferPwaInstall({
        standalone: false,
        dismissedAt: 1_000,
        now: 1_000 + PWA_DISMISS_MS - 1,
      }),
    ).toBe(false);
    expect(
      shouldOfferPwaInstall({
        standalone: false,
        dismissedAt: 1_000,
        now: 1_000 + PWA_DISMISS_MS,
      }),
    ).toBe(true);
  });

  it("uses the native prompt when the browser can install", () => {
    expect(
      pwaInstallKind({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        canPrompt: true,
      }),
    ).toBe("native");
  });

  it("guides Safari on iPhone and iPad to Add to Home Screen", () => {
    expect(
      pwaInstallKind({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        canPrompt: false,
      }),
    ).toBe("ios");
    expect(
      pwaInstallKind({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        maxTouchPoints: 5,
        canPrompt: false,
      }),
    ).toBe("ios");
  });

  it("falls back to browser install instructions elsewhere", () => {
    expect(
      pwaInstallKind({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        canPrompt: false,
      }),
    ).toBe("manual");
  });
});
