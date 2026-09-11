import type { DeskRole } from "@/lib/auth/roles";

export const ORG_ROLES = ["owner", "secretary", "steward"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ACTIVE_ORG_COOKIE = "sss-active-org";

export const DEFAULT_DEMO_ORG_ID = "org-blacksage";

export const DEFAULT_DEMO_ORG = {
  id: DEFAULT_DEMO_ORG_ID,
  name: "Blacksage Kennels",
  slug: "blacksage",
  invite_code: "BLACKSAGE-DEMO",
} as const;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "blog",
  "c",
  "club",
  "clubs",
  "demo",
  "docs",
  "health",
  "help",
  "home",
  "login",
  "logout",
  "marketing",
  "org",
  "organization",
  "organizations",
  "orgs",
  "public",
  "results",
  "ringside",
  "settings",
  "signup",
  "static",
  "support",
  "www",
]);

export interface Organization {
  id: string;
  name: string;
  slug: string;
  invite_code?: string;
  created_at?: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
}

export interface SessionOrg {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  invite_code?: string;
}

export function parseOrgRole(value: unknown): OrgRole {
  if (value === "owner" || value === "secretary" || value === "steward") {
    return value;
  }
  return "secretary";
}

/** Owners and secretaries share desk-admin access; stewards stay ringside-only. */
export function deskRoleFromOrgRole(role: OrgRole): DeskRole {
  return role === "steward" ? "steward" : "secretary";
}

export function isOrgDeskAdmin(role: OrgRole): boolean {
  return role === "owner" || role === "secretary";
}

export function slugifyClubName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseClubName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length < 2) {
    return { ok: false, error: "Club name must be at least 2 characters" };
  }
  if (name.length > 80) {
    return { ok: false, error: "Club name must be 80 characters or fewer" };
  }
  const slug = slugifyClubName(name);
  if (slug.length < 2) {
    return { ok: false, error: "Club name needs at least two letters or numbers" };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: "That club name is reserved — try a different one" };
  }
  return { ok: true, name };
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function parseInviteCode(value: unknown): { ok: true; code: string } | { ok: false; error: string } {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!/^[A-Z0-9][A-Z0-9-]{5,31}$/.test(code)) {
    return { ok: false, error: "Enter a valid invite code" };
  }
  return { ok: true, code };
}

export function generateInviteCode(prefix = "CLUB"): string {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 12) || "CLUB"}-${suffix}`;
}

export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base) && !RESERVED_SLUGS.has(base)) return base;
  for (let i = 2; i < 100; i += 1) {
    const next = `${base.slice(0, 46)}-${i}`;
    if (!used.has(next) && !RESERVED_SLUGS.has(next)) return next;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

export function clubLoginPath(slug: string): string {
  return `/c/${slug}/login`;
}

export function presentSessionOrg(
  org: SessionOrg,
  opts?: { includeInvite?: boolean },
): SessionOrg {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: org.role,
    ...(opts?.includeInvite && org.invite_code
      ? { invite_code: org.invite_code }
      : {}),
  };
}
