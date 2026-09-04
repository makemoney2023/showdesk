import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/json-ld";
import { ResultsIndexView } from "@/components/marketing/results-views";
import { resultsIndexJsonLd } from "@/lib/domain/public-results-jsonld";
import { listPublishedShows } from "@/lib/domain/public-results";
import { resultShareMetadata } from "@/lib/domain/result-share-metadata";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const revalidate = 60;

const TITLE = "Sieger show results — ratings, placements, and critiques";
const DESCRIPTION =
  "Official German-style (Sieger) show results: Formwert ratings, class placements 1–4, and the judge's written critique (Richterbericht).";

export const metadata: Metadata = resultShareMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/results",
  type: "website",
});

export default async function ResultsIndexPage() {
  const store = await readPublicResultsStore();
  const shows = listPublishedShows(store);
  return (
    <>
      <JsonLd data={resultsIndexJsonLd()} />
      <ResultsIndexView shows={shows} />
    </>
  );
}
