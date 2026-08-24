import { getPublishedDog } from "@/lib/domain/public-results";
import { resultsOgContentType, resultsOgImage, resultsOgSize } from "@/lib/og/results-card";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const runtime = "nodejs";
export const alt = "Dog show result";
export const size = resultsOgSize;
export const contentType = resultsOgContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ showSlug: string; dogSlug: string }>;
}) {
  const { showSlug, dogSlug } = await params;
  const store = await readPublicResultsStore();
  const found = getPublishedDog(store, showSlug, dogSlug);
  return resultsOgImage({
    eyebrow: found?.show.name ?? "Sieger show result",
    title: found?.dog.dogName ?? "Result",
    subtitle: found
      ? `${found.dog.classLabel} · ${found.show.displayDate}`
      : "Show Desk",
    badge: found?.dog.ratingPlacement ?? "Result",
  });
}
