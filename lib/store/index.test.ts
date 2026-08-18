import { afterEach, describe, expect, it, vi } from "vitest";
import { getStoreBackend } from "./index";

describe("getStoreBackend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns file when supabase public env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getStoreBackend()).toBe("file");
  });

  it("returns file when only the url is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getStoreBackend()).toBe("file");
  });

  it("returns supabase when both public vars are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    expect(getStoreBackend()).toBe("supabase");
  });
});
