import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/marketing/json-ld";
import { DogResultView } from "@/components/marketing/results-views";
import { dogResultJsonLd } from "@/lib/domain/public-results-jsonld";
import {
  dogResultDescription,
  dogResultHeadline,
  facebookDogPost,
  getPublishedDog,
  publicDogPaths,
} from "@/lib/domain/public-results";
import { facebookGroupUrl } from "@/lib/social/facebook-results";
import { siteUrl } from "@/lib/site-url";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const store = await readPublicResultsStore();
  return publicDogPaths(store).map((href) => {
    const [, , showSlug, dogSlug] = href.split("/");
    return { showSlug, dogSlug };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showSlug: string; dogSlug: string }>;
}): Promise<Metadata> {
  const { showSlug, dogSlug } = await params;
  const store = await readPublicResultsStore();
  const found = getPublishedDog(store, showSlug, dogSlug);
  if (!found) return { title: "Result not found" };
  const title = dogResultHeadline(found.dog, found.show);
  const description = dogResultDescription(found.dog);
  return {
    title,
    description,
    alternates: { canonical: found.dog.href },
    openGraph: {
      title,
      description,
      url: found.dog.href,
      type: "article",
      siteName: "Show Desk",
    },
  };
}

export default async function DogResultPage({
  params,
}: {
  params: Promise<{ showSlug: string; dogSlug: string }>;
}) {
  const { showSlug, dogSlug } = await params;
  const store = await readPublicResultsStore();
  const found = getPublishedDog(store, showSlug, dogSlug);
  if (!found) notFound();
  const pageUrl = `${siteUrl()}${found.dog.href}`;
  return (
    <>
      <JsonLd data={dogResultJsonLd(found.show, found.dog)} />
      <DogResultView
        show={found.show}
        dog={found.dog}
        pageUrl={pageUrl}
        shareText={facebookDogPost(found.show, found.dog, siteUrl())}
        groupUrl={facebookGroupUrl()}
      />
    </>
  );
}
