import { NextResponse } from "next/server";
import {
  facebookShowPost,
  getPublishedShow,
  showResultsPath,
  showResultsSlug,
} from "@/lib/domain/public-results";
import {
  facebookPageConfigured,
  postShowResultsToFacebookPage,
} from "@/lib/social/facebook-results";
import {
  isApiUnauthorized,
  requireApiSession,
  requireSecretaryWrite,
} from "@/lib/auth/api-guard";
import { siteUrl } from "@/lib/site-url";
import { readStore, updateStore } from "@/lib/store";

export async function GET() {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;
  const store = await readStore();
  const show = store.shows.find((item) => item.id === store.active_show_id);
  if (!show) {
    return NextResponse.json({ error: "No active show" }, { status: 404 });
  }
  return NextResponse.json({
    show_id: show.id,
    published: Boolean(show.results_published_at),
    results_published_at: show.results_published_at ?? null,
    href: showResultsPath(show),
    facebook_configured: facebookPageConfigured(),
  });
}

export async function POST(request: Request) {
  const auth = await requireSecretaryWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = (await request.json()) as {
    show_id?: string;
    published?: boolean;
    post_to_facebook?: boolean;
  };

  const store = await readStore();
  const showId = body.show_id ?? store.active_show_id;
  const existing = store.shows.find((show) => show.id === showId);
  if (!existing) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const published = body.published !== false;
  const results_published_at = published
    ? existing.results_published_at ?? new Date().toISOString()
    : undefined;

  const nextStore = await updateStore((current) => ({
    ...current,
    shows: current.shows.map((show) =>
      show.id === existing.id
        ? { ...show, results_published_at }
        : show,
    ),
  }));

  const updated = nextStore.shows.find((show) => show.id === existing.id)!;
  const href = showResultsPath(updated);
  const projected = getPublishedShow(nextStore, showResultsSlug(updated));

  let facebook:
    | { ok: true; id: string }
    | { ok: false; error: string }
    | { ok: false; skipped: string }
    | undefined;

  if (published && body.post_to_facebook) {
    if (!projected) {
      facebook = {
        ok: false,
        error: "Publish the show before posting — no public results to share",
      };
    } else if (!facebookPageConfigured()) {
      facebook = {
        ok: false,
        skipped: "Facebook Page is not configured",
      };
    } else {
      facebook = await postShowResultsToFacebookPage({
        message: facebookShowPost(projected, siteUrl()),
        link: `${siteUrl()}${projected.href}`,
      });
    }
  }

  return NextResponse.json({
    show: updated,
    href,
    facebook_configured: facebookPageConfigured(),
    facebook,
  });
}
