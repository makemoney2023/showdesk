import { critiqueExcerpt, getPublishedDog } from "@/lib/domain/public-results";
import {
  dogResultOgImage,
  photoToDataUri,
  resultsOgContentType,
  resultsOgSize,
} from "@/lib/og/results-card";
import { readPublishedDogPhoto } from "@/lib/store/public-photo";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const runtime = "nodejs";
export const alt = "Dog photo, rating, and judge critique";
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

  let photoSrc: string | null = null;
  if (found?.dog.photoHref) {
    const photo = await readPublishedDogPhoto(found.dog.showId, found.dog.entryId);
    if (photo) photoSrc = photoToDataUri(photo.bytes, photo.contentType);
  }

  return dogResultOgImage({
    showName: found?.show.name ?? "Sieger show result",
    dogName: found?.dog.dogName ?? "Result",
    classLabel: found
      ? `${found.dog.classLabel} · ${found.show.displayDate}`
      : "Show Desk",
    badge: found?.dog.ratingPlacement ?? "Result",
    critique: critiqueExcerpt(found?.dog.narrative, 240),
    photoSrc,
  });
}
