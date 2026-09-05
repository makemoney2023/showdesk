/** Canonical public origin for marketing, results shares, Open Graph, and sitemaps. */
export const PUBLIC_SITE_HOST = "www.showdesk-app.com";
export const PUBLIC_SITE_ORIGIN = `https://${PUBLIC_SITE_HOST}`;

const LEGACY_PUBLIC_HOSTS = new Set([
  "showdesk-pi.vercel.app",
  "showdesk-app.com",
]);

export function hostnameOf(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function isCanonicalPublicHost(host: string): boolean {
  return hostnameOf(host) === PUBLIC_SITE_HOST;
}

export function isLegacyPublicHost(host: string): boolean {
  return LEGACY_PUBLIC_HOSTS.has(hostnameOf(host));
}

/** Vercel deployment / team hosts that prompt a Vercel login. */
export function isPrivateVercelHost(host: string): boolean {
  const hostname = hostnameOf(host);
  if (!hostname || isCanonicalPublicHost(hostname)) return false;
  if (isLegacyPublicHost(hostname)) return false;
  return (
    hostname.includes("makemoney2023s-projects.vercel.app") ||
    /^showdesk-[a-z0-9-]+\.vercel\.app$/.test(hostname)
  );
}

/** Production hosts that should 308 to www.showdesk-app.com. */
export function shouldRedirectToPublicOrigin(host: string): boolean {
  const hostname = hostnameOf(host);
  if (!hostname || isCanonicalPublicHost(hostname)) return false;
  return isLegacyPublicHost(hostname) || isPrivateVercelHost(hostname);
}

function normalizeOrigin(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/\/$/, "");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (isPrivateVercelHost(url.host) || isLegacyPublicHost(url.host)) {
      return null;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Absolute site origin used for metadata, sitemaps, and share URLs. */
export function siteUrl(): string {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    PUBLIC_SITE_ORIGIN
  );
}

export function absoluteUrl(path: string): string {
  const origin = siteUrl();
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`;
}

/** Rewrite a copied or shared URL onto the public results origin. */
export function publicPageUrl(pathOrUrl: string): string {
  try {
    const origin = siteUrl();
    const url = /^https?:\/\//i.test(pathOrUrl)
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`, origin);
    return `${origin}${url.pathname}${url.search}`;
  } catch {
    return pathOrUrl;
  }
}

const NON_CANONICAL_SHARE_HOST =
  /https?:\/\/(?:[^\s/]*makemoney2023s-projects\.vercel\.app|showdesk-[a-z0-9-]+\.vercel\.app|showdesk-pi\.vercel\.app|showdesk-app\.com)[^\s]*/gi;

/** Rewrite copied Vercel / apex / legacy hosts onto www.showdesk-app.com. */
export function rewritePrivateShareText(text: string): string {
  return text.replace(NON_CANONICAL_SHARE_HOST, (match) => publicPageUrl(match));
}
