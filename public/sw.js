/* Show Desk ringside service worker.
 * Policy lives in lib/domain/service-worker.ts — keep CACHE_NAME / PRECACHE
 * and the fetch strategy in sync when either file changes.
 */
const CACHE_NAME = "showdesk-ringside-v1";
const PRECACHE = ["/ringside", "/ringside/placements", "/login"];
const RINGSIDE_API_GETS = new Set([
  "/api/shows",
  "/api/entries",
  "/api/critiques",
  "/api/evaluations",
  "/api/placements",
]);

function nextStaticAssetUrlsFromHtml(html) {
  return [
    ...new Set(
      [...html.matchAll(/\b(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

async function precacheShells() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE.map(async (path) => {
      try {
        const response = await fetch(path, { credentials: "same-origin" });
        if (!response.ok) return;
        await cache.put(path, response.clone());
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) return;
        const assets = nextStaticAssetUrlsFromHtml(await response.text());
        await Promise.all(
          assets.map(async (url) => {
            try {
              const asset = await fetch(url);
              if (asset.ok) await cache.put(url, asset);
            } catch {
              /* skip a missing chunk so one 404 does not abort install */
            }
          }),
        );
      } catch {
        /* skip a failed shell so login/ringside still install independently */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShells().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("showdesk-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isImmutableStatic(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/pwa-icon/") ||
    /\.(?:woff2?|ttf|css|js|png|jpe?g|webp|svg)$/.test(pathname)
  );
}

function isRingsidePath(pathname) {
  return pathname === "/ringside" || pathname.startsWith("/ringside/");
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (isImmutableStatic(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const isDocument =
    request.mode === "navigate" || request.destination === "document";
  if (isDocument || isRingsidePath(url.pathname)) {
    event.respondWith(
      networkFirst(request, isRingsidePath(url.pathname) ? "/ringside" : undefined),
    );
    return;
  }

  if (RINGSIDE_API_GETS.has(url.pathname)) {
    event.respondWith(networkFirst(request));
  }
});
