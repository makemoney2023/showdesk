import type { MetadataRoute } from "next";
import { listPublishedShows, publicDogPaths } from "@/lib/domain/public-results";
import { siteUrl } from "@/lib/site-url";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const store = await readPublicResultsStore();
  const shows = listPublishedShows(store);
  const dogPaths = publicDogPaths(store);

  return [
    {
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/results`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...shows.map((show) => ({
      url: `${origin}${show.href}`,
      lastModified: show.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...dogPaths.map((href) => ({
      url: `${origin}${href}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
