import type { PublicShowResults } from "@/lib/domain/public-results";

export function facebookPageConfigured(): boolean {
  return Boolean(
    process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
  );
}

export function facebookGroupUrl(): string | null {
  return process.env.NEXT_PUBLIC_FACEBOOK_GROUP_URL?.trim() || null;
}

export async function postShowResultsToFacebookPage(input: {
  message: string;
  link: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    return {
      ok: false,
      error: "Facebook Page posting is not configured",
    };
  }

  const body = new URLSearchParams({
    message: input.message,
    link: input.link,
    access_token: token,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/feed`,
    { method: "POST", body },
  );
  const payload = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !payload.id) {
    return {
      ok: false,
      error: payload.error?.message ?? `Facebook returned ${response.status}`,
    };
  }
  return { ok: true, id: payload.id };
}

export function facebookShareDialogUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

export function facebookGroupShareHint(show: PublicShowResults): string {
  return `Paste the official results for ${show.name} into Global Sieger Show Results.`;
}
