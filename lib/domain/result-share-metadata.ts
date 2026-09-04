import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

/** Stable Open Graph + Twitter tags so Facebook / iMessage / WhatsApp preview the public URL. */
export function resultShareMetadata(input: {
  title: string;
  description: string;
  path: string;
  type?: "article" | "website";
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: input.type ?? "article",
      siteName: "Show Desk",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}
