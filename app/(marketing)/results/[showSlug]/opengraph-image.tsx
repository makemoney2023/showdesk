import { getPublishedShow } from "@/lib/domain/public-results";
import { resultsOgContentType, resultsOgImage, resultsOgSize } from "@/lib/og/results-card";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const runtime = "nodejs";
export const alt = "Sieger show results";
export const size = resultsOgSize;
export const contentType = resultsOgContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}) {
  const { showSlug } = await params;
  const store = await readPublicResultsStore();
  const show = getPublishedShow(store, showSlug);
  return resultsOgImage({
    eyebrow: "Official Sieger show results",
    title: show?.name ?? "Show results",
    subtitle: show
      ? `${show.displayDate} · ${show.dogCount} judged`
      : "Show Desk",
    badge: show ? String(show.placedCount) : undefined,
  });
}
