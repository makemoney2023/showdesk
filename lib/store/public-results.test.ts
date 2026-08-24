import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldUseSampleResults } from "./public-results";

describe("shouldUseSampleResults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never replaces a live published show", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(shouldUseSampleResults(3)).toBe(false);
  });

  it("fills an empty preview so sample dog URLs resolve", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(shouldUseSampleResults(0)).toBe(true);
  });

  it("leaves production empty until a club publishes", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(shouldUseSampleResults(0)).toBe(false);
  });
});
