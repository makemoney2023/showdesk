/** Bump this when the offline shell contract changes. Kept in sync with /public/sw.js. */
export const RINGSIDE_CACHE_NAME = "showdesk-ringside-v1";

export const RINGSIDE_PRECACHE_PATHS = [
  "/ringside",
  "/ringside/placements",
  "/login",
] as const;

const RINGSIDE_API_GETS = new Set([
  "/api/shows",
  "/api/entries",
  "/api/critiques",
  "/api/evaluations",
  "/api/placements",
]);

export type ServiceWorkerFetchStrategy =
  | "network-only"
  | "network-first"
  | "cache-first";

export function isSameOrigin(requestUrl: string, origin: string): boolean {
  try {
    return new URL(requestUrl).origin === origin;
  } catch {
    return false;
  }
}

export function isRingsideNavigationPath(pathname: string): boolean {
  return pathname === "/ringside" || pathname.startsWith("/ringside/");
}

export function isImmutableStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/pwa-icon/") ||
    /\.(?:woff2?|ttf|css|js|png|jpe?g|webp|svg)$/.test(pathname)
  );
}

export function isRingsideApiGetPath(pathname: string): boolean {
  return RINGSIDE_API_GETS.has(pathname);
}

/**
 * Show-day cache rules:
 * - Never intercept writes (POST/PUT/PATCH/DELETE) or cross-origin traffic.
 * - Hashed static assets are cache-first (filenames change on deploy).
 * - Navigations and ringside GET APIs are network-first so online is always
 *   fresh, and a mid-ring reload can fall back to the last good shell/data.
 */
export function serviceWorkerFetchStrategy(input: {
  method: string;
  url: string;
  origin: string;
  destination?: string;
  mode?: string;
}): ServiceWorkerFetchStrategy {
  if (input.method !== "GET") return "network-only";
  if (!isSameOrigin(input.url, input.origin)) return "network-only";

  let pathname = "/";
  try {
    pathname = new URL(input.url).pathname;
  } catch {
    return "network-only";
  }

  if (isImmutableStaticPath(pathname)) return "cache-first";

  const isDocument =
    input.destination === "document" || input.mode === "navigate";
  if (isDocument || isRingsideNavigationPath(pathname)) return "network-first";
  if (isRingsideApiGetPath(pathname)) return "network-first";
  return "network-only";
}

export function ringsideNavigationFallbackPath(pathname: string): string | null {
  return isRingsideNavigationPath(pathname) ? "/ringside" : null;
}
