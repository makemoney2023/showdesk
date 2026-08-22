import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

import { getSessionUser } from "@/lib/auth/session";
import {
  isApiUnauthorized,
  requireApiSession,
  requireApiWrite,
  requireSecretaryWrite,
} from "@/lib/auth/api-guard";

const secretary = {
  id: "demo-secretary",
  email: "secretary@demo.local",
  name: "Demo Secretary",
  role: "secretary" as const,
};

const steward = {
  id: "demo-steward",
  email: "steward@demo.local",
  name: "Demo Steward",
  role: "steward" as const,
};

describe("api guards", () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockReset();
    vi.unstubAllEnvs();
  });

  it("returns 401 NextResponse when no session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const result = await requireApiSession();
    expect(isApiUnauthorized(result)).toBe(true);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns user object when session exists", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(secretary);
    const result = await requireApiSession();
    expect(isApiUnauthorized(result)).toBe(false);
    if (!isApiUnauthorized(result)) {
      expect(result.user.email).toBe("secretary@demo.local");
      expect(result.user.role).toBe("secretary");
    }
  });

  it("blocks hosted demo writes", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(secretary);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("ALLOW_DEMO_WRITES", "");
    const result = await requireApiWrite();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("rejects steward on secretary writes", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(steward);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    const result = await requireSecretaryWrite();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("allows secretary writes when demo is local", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(secretary);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    const result = await requireSecretaryWrite();
    expect(isApiUnauthorized(result)).toBe(false);
  });
});
