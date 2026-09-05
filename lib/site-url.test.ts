import { afterEach, describe, expect, it } from "vitest";
import {
  absoluteUrl,
  isCanonicalPublicHost,
  isLegacyPublicHost,
  isPrivateVercelHost,
  publicPageUrl,
  rewritePrivateShareText,
  shouldRedirectToPublicOrigin,
  siteUrl,
} from "./site-url";

const KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

const original = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] == null) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("siteUrl", () => {
  it("prefers the public www origin over a Vercel deployment host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.showdesk-app.com/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "showdesk-pi.vercel.app";
    process.env.VERCEL_URL = "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app";
    expect(siteUrl()).toBe("https://www.showdesk-app.com");
  });

  it("ignores a leftover NEXT_PUBLIC_SITE_URL on the old Vercel alias", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://showdesk-pi.vercel.app";
    expect(siteUrl()).toBe("https://www.showdesk-app.com");
  });

  it("ignores the legacy Vercel alias and team hosts", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "showdesk-pi.vercel.app";
    process.env.VERCEL_URL =
      "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app";
    expect(siteUrl()).toBe("https://www.showdesk-app.com");
    expect(isCanonicalPublicHost("www.showdesk-app.com")).toBe(true);
    expect(isLegacyPublicHost("showdesk-pi.vercel.app")).toBe(true);
    expect(isLegacyPublicHost("showdesk-app.com")).toBe(true);
    expect(
      isPrivateVercelHost(
        "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app",
      ),
    ).toBe(true);
    expect(shouldRedirectToPublicOrigin("showdesk-pi.vercel.app")).toBe(true);
    expect(shouldRedirectToPublicOrigin("showdesk-app.com")).toBe(true);
    expect(shouldRedirectToPublicOrigin("www.showdesk-app.com")).toBe(false);
    expect(
      publicPageUrl(
        "https://showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app/results/ason",
      ),
    ).toBe("https://www.showdesk-app.com/results/ason");
    expect(
      rewritePrivateShareText(
        "Critique: https://showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app/results/ason",
      ),
    ).toBe("Critique: https://www.showdesk-app.com/results/ason");
    expect(
      rewritePrivateShareText(
        "See https://showdesk-pi.vercel.app/results/ason",
      ),
    ).toBe("See https://www.showdesk-app.com/results/ason");
    expect(absoluteUrl("/results/ason")).toBe(
      "https://www.showdesk-app.com/results/ason",
    );
  });
});
