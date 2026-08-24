import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/marketing/json-ld";
import { ShowResultsView } from "@/components/marketing/results-views";
import { showResultsJsonLd } from "@/lib/domain/public-results-jsonld";
import {
  facebookShowPost,
  getPublishedShow,
  listPublishedShows,
} from "@/lib/domain/public-results";
import { facebookGroupUrl } from "@/lib/social/facebook-results";
import { siteUrl } from "@/lib/site-url";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const store = await readPublicResultsStore();
  return listPublishedShows(store).map((show) => ({ showSlug: show.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}): Promise<Metadata> {
  const { showSlug } = await params;
  const store = await readPublicResultsStore();
  const show = getPublishedShow(store, showSlug);
  if (!show) return { title: "Show results not found" };
  const title = `${show.name} results — ${show.displayDate}`;
  return {
    title,
    description: show.definition,
    alternates: { canonical: show.href },
    openGraph: {
      title,
      description: show.definition,
      url: show.href,
      type: "article",
      siteName: "Show Desk",
    },
  };
}

export default async function ShowResultsPage({
  params,
}: {
  params: Promise<{ showSlug: string }>;
}) {
  const { showSlug } = await params;
  const store = await readPublicResultsStore();
  const show = getPublishedShow(store, showSlug);
  if (!show) notFound();
  const pageUrl = `${siteUrl()}${show.href}`;
  return (
    <>
      <JsonLd data={showResultsJsonLd(show)} />
      <ShowResultsView
        show={show}
        pageUrl={pageUrl}
        shareText={facebookShowPost(show, siteUrl())}
        groupUrl={facebookGroupUrl()}
      />
    </>
  );
}
