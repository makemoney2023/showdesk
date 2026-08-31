import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { DemoVideosSection } from "@/components/marketing/demo-videos";
import { FaqSection, FAQ_ITEMS } from "@/components/marketing/faq";
import {
  ScrollProgress,
  TermMarquee,
} from "@/components/marketing/motion-primitives";
import {
  AudienceSection,
  ComparisonSection,
  DefinitionSection,
  FeatureGrid,
  FinalCta,
  MarketingFooter,
  MarketingNav,
  OfflineSection,
  ProblemSection,
} from "@/components/marketing/sections";

const DESCRIPTION =
  "Show secretary software for German-style breed shows. The judge's spoken critique becomes an official certificate in the owner's inbox the same day.";

export const metadata: Metadata = {
  title: "Show Desk — Sieger Show Secretary & Critique Software",
  description: DESCRIPTION,
  // Anonymous visitors are served this page at "/" via middleware rewrite.
  alternates: { canonical: "/" },
  openGraph: {
    title: "The judge speaks. The certificate arrives the same day.",
    description: DESCRIPTION,
    type: "website",
    url: "/",
    siteName: "Show Desk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Show Desk — Sieger Show Secretary & Critique Software",
    description: DESCRIPTION,
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Show Desk",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Show secretary software for German-style breed shows. Records the judge's spoken critique ringside, transcribes it live, and delivers the official critique certificate to the owner's inbox the same day.",
  audience: {
    "@type": "Audience",
    audienceType: "Dog show clubs, show secretaries, conformation judges",
  },
  featureList: [
    "Ringside critique recording with live transcription",
    "SE (Standard Evaluation) digital forms",
    "Formwert ratings and class placements",
    "Official critique certificate, SE, and award PDFs",
    "Same-day owner email delivery",
    "Offline-first recording with sync",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Show Desk",
  description:
    "Show Desk is show secretary software for German-style breed shows — Sieger shows, SE evaluations, and breed surveys.",
};

export default function MarketingHomePage() {
  return (
    <div className="bg-[#070707] text-[#f7f4ed] selection:bg-[#c4a35a] selection:text-[#141210]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <ScrollProgress />
      <MarketingNav />
      <main>
        <Hero />
        <TermMarquee />
        <ProblemSection />
        <DefinitionSection />
        <DemoVideosSection />
        <HowItWorks />
        <FeatureGrid />
        <OfflineSection />
        <ComparisonSection />
        <AudienceSection />
        <FaqSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
