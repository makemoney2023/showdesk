import { cookies } from "next/headers";
import { readStore } from "@/lib/store/file-store";
import { parseDeskRole, type DeskRole } from "@/lib/auth/roles";
import {
  deskRoleFromOrgRole,
  isOrgDeskAdmin,
  parseOrgRole,
  presentSessionOrg,
  type SessionOrg,
} from "@/lib/auth/org";
import { readActiveOrgId } from "@/lib/auth/org-cookie";
import { isDemoMode, getDemoSessionCookieName } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: DeskRole;
  org: SessionOrg | null;
  orgs: SessionOrg[];
}

function pickActiveOrg(
  orgs: SessionOrg[],
  preferredId: string | null,
): SessionOrg | null {
  if (orgs.length === 0) return null;
  if (preferredId) {
    const match = orgs.find((org) => org.id === preferredId);
    if (match) return match;
  }
  return orgs.length === 1 ? (orgs[0] ?? null) : null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const session = cookieStore.get(getDemoSessionCookieName())?.value;
    if (!session) return null;
    const store = await readStore();
    const user = store.demo_users.find((u) => u.id === session);
    if (!user) return null;
    const memberships = (store.memberships ?? []).filter(
      (membership) => membership.user_id === user.id,
    );
    const orgs: SessionOrg[] = memberships.flatMap((membership) => {
      const org = (store.organizations ?? []).find(
        (item) => item.id === membership.org_id,
      );
      if (!org) return [];
      return [
        {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: parseOrgRole(membership.role),
          invite_code: org.invite_code,
        },
      ];
    });
    const preferredId = await readActiveOrgId();
    const org = pickActiveOrg(orgs, preferredId);
    const role = org
      ? deskRoleFromOrgRole(org.role)
      : parseDeskRole(user.role);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      org: org
        ? presentSessionOrg(org, { includeInvite: isOrgDeskAdmin(org.role) })
        : null,
      orgs: orgs.map((item) =>
        presentSessionOrg(item, { includeInvite: isOrgDeskAdmin(item.role) }),
      ),
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("id, org_id, role, organizations ( id, name, slug, invite_code )")
    .eq("user_id", data.user.id);

  const orgs: SessionOrg[] = [];
  if (!error && Array.isArray(rows)) {
    for (const row of rows) {
      const orgRel = row.organizations as
        | { id: string; name: string; slug: string; invite_code?: string }
        | { id: string; name: string; slug: string; invite_code?: string }[]
        | null;
      const org = Array.isArray(orgRel) ? orgRel[0] : orgRel;
      if (!org) continue;
      const role = parseOrgRole(row.role);
      orgs.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role,
        invite_code: org.invite_code,
      });
    }
  }

  const preferredId = await readActiveOrgId();
  const org = pickActiveOrg(orgs, preferredId);
  const role = org
    ? deskRoleFromOrgRole(org.role)
    : parseDeskRole(data.user.user_metadata?.role);

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: data.user.user_metadata?.name,
    role,
    org: org
      ? presentSessionOrg(org, { includeInvite: isOrgDeskAdmin(org.role) })
      : null,
    orgs: orgs.map((item) =>
      presentSessionOrg(item, { includeInvite: isOrgDeskAdmin(item.role) }),
    ),
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
