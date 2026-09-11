import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import {
  readPublicResultsStore,
  resetPublicResultsStoreCache,
  shouldUseSampleResults,
} from "./public-results";

const sbReadStore = vi.hoisted(() => vi.fn(async () => EMPTY_STORE));

vi.mock("./supabase-store", () => ({
  sbReadStore,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: vi.fn() }),
}));

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

describe("readPublicResultsStore", () => {
  afterEach(() => {
    resetPublicResultsStoreCache();
    vi.unstubAllEnvs();
    sbReadStore.mockClear();
  });

  it("reuses one live snapshot within the process TTL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("VERCEL_ENV", "production");

    await readPublicResultsStore();
    await readPublicResultsStore();

    expect(sbReadStore).toHaveBeenCalledTimes(1);
  });
});
