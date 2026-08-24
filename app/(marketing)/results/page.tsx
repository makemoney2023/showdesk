import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/json-ld";
import { ResultsIndexView } from "@/components/marketing/results-views";
import { resultsIndexJsonLd } from "@/lib/domain/public-results-jsonld";
import { listPublishedShows } from "@/lib/domain/public-results";
import { readPublicResultsStore } from "@/lib/store/public-results";

export const revalidate = 60;

const TITLE = "Sieger show results — ratings, placements, and critiques";
const DESCRIPTION =
  "Official German-style (Sieger) show results: Formwert ratings, class placements 1–4, and the judge's written critique (Richterbericht).";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/results" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/results",
    type: "website",
    siteName: "Show Desk",
  },
};

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
