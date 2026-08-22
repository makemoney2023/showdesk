import { afterEach, describe, expect, it, vi } from "vitest";
import { demoWritesBlocked, isDemoMode, isHostedVercel } from "./config";

describe("demo write guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is demo when supabase public env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isDemoMode()).toBe(true);
  });

  it("blocks writes on hosted Vercel demo", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_WRITES", "");
    expect(isHostedVercel()).toBe(true);
    expect(demoWritesBlocked()).toBe(true);
  });

  it("allows writes when ALLOW_DEMO_WRITES=1", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_WRITES", "1");
    expect(demoWritesBlocked()).toBe(false);
  });

  it("allows local demo writes", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect(demoWritesBlocked()).toBe(false);
  });

  it("does not block when supabase is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(isDemoMode()).toBe(false);
    expect(demoWritesBlocked()).toBe(false);
  });
});
