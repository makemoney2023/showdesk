import { describe, expect, it } from "vitest";
import {
  MARKETING_DESCRIPTION,
  MARKETING_OG_TITLE,
  MARKETING_TITLE,
  marketingShareMetadata,
} from "./marketing-share-metadata";

describe("marketingShareMetadata", () => {
  it("emits Open Graph and a large Twitter card on the public origin", () => {
    const meta = marketingShareMetadata();
    expect(meta.title).toBe(MARKETING_TITLE);
    expect(meta.description).toBe(MARKETING_DESCRIPTION);
    expect(meta.openGraph?.type).toBe("website");
    expect(meta.openGraph?.siteName).toBe("Show Desk");
    expect(meta.openGraph?.title).toBe(MARKETING_OG_TITLE);
    expect(String(meta.openGraph?.url)).toBe("https://www.showdesk-app.com/");
    expect(String(meta.openGraph?.url)).not.toContain(
      "makemoney2023s-projects.vercel.app",
    );
    expect(String(meta.openGraph?.url)).not.toContain("showdesk-pi.vercel.app");
    const images = meta.openGraph?.images;
    const image = Array.isArray(images) ? images[0] : images;
    expect(image).toMatchObject({
      url: "https://www.showdesk-app.com/og.png",
      width: 1200,
      height: 630,
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: MARKETING_TITLE,
      images: ["https://www.showdesk-app.com/og.png"],
    });
  });

  it("keeps an inner marketing path on the public host", () => {
    const meta = marketingShareMetadata({
      title: "How it works — Show Desk",
      path: "/home",
    });
    expect(String(meta.openGraph?.url)).toBe(
      "https://www.showdesk-app.com/home",
    );
    expect(meta.alternates?.canonical).toBe("/home");
  });
});
