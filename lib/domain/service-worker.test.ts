import { describe, expect, it } from "vitest";
import {
  RINGSIDE_CACHE_NAME,
  RINGSIDE_PRECACHE_PATHS,
  isRingsideNavigationPath,
  ringsideNavigationFallbackPath,
  serviceWorkerFetchStrategy,
} from "./service-worker";

const origin = "https://showdesk.example";

describe("service worker cache policy", () => {
  it("keeps a stable cache name and precaches the ringside shell", () => {
    expect(RINGSIDE_CACHE_NAME).toBe("showdesk-ringside-v1");
    expect(RINGSIDE_PRECACHE_PATHS).toEqual([
      "/ringside",
      "/ringside/placements",
      "/login",
    ]);
  });

  it("never caches writes or cross-origin traffic", () => {
    expect(
      serviceWorkerFetchStrategy({
        method: "POST",
        url: `${origin}/api/critiques`,
        origin,
      }),
    ).toBe("network-only");
    expect(
      serviceWorkerFetchStrategy({
        method: "GET",
        url: "https://api.deepgram.com/v1/listen",
        origin,
      }),
    ).toBe("network-only");
  });

  it("uses cache-first for hashed static assets", () => {
    expect(
      serviceWorkerFetchStrategy({
        method: "GET",
        url: `${origin}/_next/static/chunks/app.js`,
        origin,
      }),
    ).toBe("cache-first");
  });

  it("uses network-first for ringside navigations and roster APIs", () => {
    expect(
      serviceWorkerFetchStrategy({
        method: "GET",
        url: `${origin}/ringside/record/entry-1`,
        origin,
        mode: "navigate",
        destination: "document",
      }),
    ).toBe("network-first");
    expect(
      serviceWorkerFetchStrategy({
        method: "GET",
        url: `${origin}/api/entries?show_id=s1`,
        origin,
      }),
    ).toBe("network-first");
    expect(
      serviceWorkerFetchStrategy({
        method: "GET",
        url: `${origin}/api/pdf/tnrk?kind=critique&show_id=s1`,
        origin,
      }),
    ).toBe("network-only");
  });

  it("falls an unknown record URL back to the ringside shell", () => {
    expect(isRingsideNavigationPath("/ringside/record/entry-1")).toBe(true);
    expect(ringsideNavigationFallbackPath("/ringside/record/entry-1")).toBe(
      "/ringside",
    );
    expect(ringsideNavigationFallbackPath("/admin/review")).toBeNull();
  });
});
