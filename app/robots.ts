import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/results", "/results/"],
        disallow: ["/admin", "/ringside", "/api", "/login"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
