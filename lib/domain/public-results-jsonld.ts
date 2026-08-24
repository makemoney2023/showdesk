import { siteUrl } from "@/lib/site-url";
import type { PublicDogResult, PublicShowResults } from "./public-results";

export function showResultsJsonLd(show: PublicShowResults) {
  const origin = siteUrl();
  const competitors = show.divisions.flatMap((division) =>
    division.dogs.map((dog) => ({
      "@type": "Person",
      name: dog.dogName,
      identifier: dog.armband,
      description: dog.ratingPlacement
        ? `${dog.ratingPlacement} · ${dog.classLabel}`
        : dog.classLabel,
      url: `${origin}${dog.href}`,
    })),
  );

  return [
    {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: show.name,
      description: show.definition,
      startDate: show.date,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: show.venue
        ? { "@type": "Place", name: show.venue }
        : undefined,
      organizer: { "@type": "Organization", name: "Show Desk" },
      performer: show.judges.map((name) => ({
        "@type": "Person",
        name,
        jobTitle: "Judge",
      })),
      competitor: competitors,
      url: `${origin}${show.href}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Sieger show results",
          item: `${origin}/results`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: show.name,
          item: `${origin}${show.href}`,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does a rating like V1 mean?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The letter is the Formwert rating and the number is the class placement — they are separate. V (vorzüglich) means Excellent; 1 means the dog also placed first in its class. Many dogs can earn a V; only four place.",
          },
        },
        {
          "@type": "Question",
          name: "What is a Richterbericht?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A Richterbericht is the judge's written critique of a dog at a German-style show. Under ADRK rules, critiques rated V or SG are required documents for a Körung (breed survey).",
          },
        },
      ],
    },
  ];
}

export function dogResultJsonLd(show: PublicShowResults, dog: PublicDogResult) {
  const origin = siteUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${dog.dogName} ${dog.ratingPlacement ?? ""}`.trim(),
      description: dog.narrative ?? show.definition,
      datePublished: show.publishedAt,
      dateModified: show.publishedAt,
      author: dog.judge
        ? { "@type": "Person", name: dog.judge }
        : { "@type": "Organization", name: "Show Desk" },
      publisher: { "@type": "Organization", name: "Show Desk" },
      mainEntityOfPage: `${origin}${dog.href}`,
      image: dog.photoHref ? `${origin}${dog.photoHref}` : undefined,
      about: {
        "@type": "Thing",
        name: dog.dogName,
        identifier: dog.zbNumber ?? dog.armband,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Sieger show results",
          item: `${origin}/results`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: show.name,
          item: `${origin}${show.href}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: dog.dogName,
          item: `${origin}${dog.href}`,
        },
      ],
    },
  ];
}

export function resultsIndexJsonLd() {
  const origin = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sieger show results",
    description:
      "Official German-style (Sieger) show results: Formwert ratings, class placements, and judge critiques.",
    url: `${origin}/results`,
    isPartOf: { "@type": "WebSite", name: "Show Desk", url: origin },
  };
}
