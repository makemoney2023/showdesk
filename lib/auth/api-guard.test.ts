import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

import { getSessionUser } from "@/lib/auth/session";
import { requireApiSession, isApiUnauthorized } from "@/lib/auth/api-guard";

describe("requireApiSession", () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockReset();
  });

  it("returns 401 NextResponse when no session", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const result = await requireApiSession();
    expect(isApiUnauthorized(result)).toBe(true);
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns user object when session exists", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "demo-secretary",
      email: "secretary@demo.local",
      name: "Demo Secretary",
    });
    const result = await requireApiSession();
    expect(isApiUnauthorized(result)).toBe(false);
    if (!isApiUnauthorized(result)) {
      expect(result.user.email).toBe("secretary@demo.local");
    }
  });
});
