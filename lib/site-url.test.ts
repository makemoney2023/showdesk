import { afterEach, describe, expect, it } from "vitest";
import {
  absoluteUrl,
  isPrivateVercelHost,
  publicPageUrl,
  rewritePrivateShareText,
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
  it("prefers the public site origin over a Vercel deployment host", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://showdesk-pi.vercel.app/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "showdesk-pi.vercel.app";
    process.env.VERCEL_URL = "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app";
    expect(siteUrl()).toBe("https://showdesk-pi.vercel.app");
  });

  it("ignores the team Vercel host when that is the production URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL =
      "showdesk-makemoney2023s-projects.vercel.app";
    process.env.VERCEL_URL =
      "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app";
    expect(siteUrl()).toBe("https://showdesk-pi.vercel.app");
    expect(
      isPrivateVercelHost(
        "showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app",
      ),
    ).toBe(true);
    expect(
      publicPageUrl(
        "https://showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app/results/ason",
      ),
    ).toBe("https://showdesk-pi.vercel.app/results/ason");
    expect(
      rewritePrivateShareText(
        "Critique: https://showdesk-mia9lqgbu-makemoney2023s-projects.vercel.app/results/ason",
      ),
    ).toBe("Critique: https://showdesk-pi.vercel.app/results/ason");
    expect(absoluteUrl("/results/ason")).toBe(
      "https://showdesk-pi.vercel.app/results/ason",
    );
  });
});
