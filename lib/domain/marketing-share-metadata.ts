import type { Metadata } from "next";
import { marketingOgAlt, marketingOgSize } from "@/lib/og/marketing-og";
import { absoluteUrl } from "@/lib/site-url";

export const MARKETING_TITLE =
  "Show Desk — Sieger Show Secretary & Critique Software";
export const MARKETING_OG_TITLE =
  "The judge speaks. The certificate arrives the same day.";
export const MARKETING_DESCRIPTION =
  "Show secretary software for German-style breed shows. The judge's spoken critique becomes an official certificate in the owner's inbox the same day.";

const SHARE_IMAGE = {
  url: absoluteUrl("/og.png"),
  width: marketingOgSize.width,
  height: marketingOgSize.height,
  alt: marketingOgAlt,
  type: "image/png",
} as const;

/**
 * Open Graph + Twitter tags for the public marketing site.
 * Uses the production origin and a stable /og.png so Facebook / iMessage
 * / WhatsApp do not depend on hashed /home/opengraph-image routes.
 */
export function marketingShareMetadata(input?: {
  title?: string;
  ogTitle?: string;
  description?: string;
  path?: string;
}): Metadata {
  const path = input?.path ?? "/";
  const title = input?.title ?? MARKETING_TITLE;
  const description = input?.description ?? MARKETING_DESCRIPTION;
  const ogTitle = input?.ogTitle ?? MARKETING_OG_TITLE;
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: "website",
      siteName: "Show Desk",
      locale: "en_CA",
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_IMAGE.url],
    },
  };
}
