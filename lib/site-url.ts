/** Public origin for results shares, Open Graph, and sitemaps. */
export const PUBLIC_SITE_ORIGIN = "https://showdesk-pi.vercel.app";

/** Vercel deployment / team hosts that prompt a Vercel login. */
export function isPrivateVercelHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname || hostname === "showdesk-pi.vercel.app") return false;
  return (
    hostname.includes("makemoney2023s-projects.vercel.app") ||
    /^showdesk-[a-z0-9-]+\.vercel\.app$/.test(hostname)
  );
}

function normalizeOrigin(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/\/$/, "");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (isPrivateVercelHost(url.host)) return null;
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

export function rewritePrivateShareText(text: string): string {
  return text.replace(
    /https?:\/\/[^\s]+makemoney2023s-projects\.vercel\.app[^\s]*/gi,
    (match) => publicPageUrl(match),
  );
}
