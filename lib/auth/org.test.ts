import { describe, expect, it } from "vitest";
import {
  clubLoginPath,
  deskRoleFromOrgRole,
  generateInviteCode,
  isOrgDeskAdmin,
  isReservedSlug,
  parseClubName,
  parseInviteCode,
  parseOrgRole,
  slugifyClubName,
  uniqueSlug,
} from "./org";

describe("slugifyClubName", () => {
  it("turns a club name into a URL slug", () => {
    expect(slugifyClubName("True North Rottweiler Klub")).toBe(
      "true-north-rottweiler-klub",
    );
    expect(slugifyClubName("  Blacksage Kennels  ")).toBe("blacksage-kennels");
  });

  it("strips punctuation and accents", () => {
    expect(slugifyClubName("Süddeutsche Körung!")).toBe("suddeutsche-korung");
  });
});

describe("parseClubName", () => {
  it("accepts a real club name", () => {
    expect(parseClubName(" Blacksage Kennels ")).toEqual({
      ok: true,
      name: "Blacksage Kennels",
    });
  });

  it("rejects reserved or empty names", () => {
    expect(parseClubName("login").ok).toBe(false);
    expect(parseClubName("A").ok).toBe(false);
    expect(parseClubName("!!!").ok).toBe(false);
  });
});

describe("parseInviteCode", () => {
  it("normalizes a valid code", () => {
    expect(parseInviteCode(" blacksage-demo ")).toEqual({
      ok: true,
      code: "BLACKSAGE-DEMO",
    });
  });

  it("rejects short or junk codes", () => {
    expect(parseInviteCode("ab").ok).toBe(false);
    expect(parseInviteCode("****").ok).toBe(false);
  });
});

describe("org roles", () => {
  it("maps owner and secretary to desk admin", () => {
    expect(deskRoleFromOrgRole("owner")).toBe("secretary");
    expect(deskRoleFromOrgRole("secretary")).toBe("secretary");
    expect(deskRoleFromOrgRole("steward")).toBe("steward");
    expect(isOrgDeskAdmin("owner")).toBe(true);
    expect(isOrgDeskAdmin("steward")).toBe(false);
    expect(parseOrgRole("owner")).toBe("owner");
    expect(parseOrgRole("nope")).toBe("secretary");
  });
});

describe("uniqueSlug / invite / login path", () => {
  it("avoids taken and reserved slugs", () => {
    expect(uniqueSlug("login", [])).toBe("login-2");
    expect(uniqueSlug("tnrk", ["tnrk", "tnrk-2"])).toBe("tnrk-3");
    expect(isReservedSlug("admin")).toBe(true);
  });

  it("builds a club login path and a readable invite code", () => {
    expect(clubLoginPath("blacksage")).toBe("/c/blacksage/login");
    expect(generateInviteCode("Blacksage")).toMatch(/^BLACKSAGE-[A-Z0-9]{8}$/);
  });
});
