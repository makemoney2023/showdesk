import { describe, expect, it } from "vitest";
import { resultShareMetadata } from "./result-share-metadata";

describe("resultShareMetadata", () => {
  it("emits Open Graph and a large Twitter card on the public origin", () => {
    const meta = resultShareMetadata({
      title: "Ason Von Haus Wilkerson V — TNRK Sieger Show 2026 results",
      description: "Ason Von Haus Wilkerson earned V (Excellent).",
      path: "/results/tnrk-sieger-show-2026-2026-09-04/38-ason-von-haus-wilkerson",
    });
    expect(meta.openGraph?.type).toBe("article");
    expect(meta.openGraph?.siteName).toBe("Show Desk");
    expect(meta.openGraph?.url).toContain(
      "/results/tnrk-sieger-show-2026-2026-09-04/38-ason-von-haus-wilkerson",
    );
    expect(String(meta.openGraph?.url)).not.toContain(
      "makemoney2023s-projects.vercel.app",
    );
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: meta.title,
    });
  });
});
