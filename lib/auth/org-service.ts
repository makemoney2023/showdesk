import { newId, updateStore } from "@/lib/store";
import { readStore as readFileStore } from "@/lib/store/file-store";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateInviteCode,
  parseClubName,
  parseInviteCode,
  slugifyClubName,
  uniqueSlug,
  type OrgRole,
  type SessionOrg,
} from "@/lib/auth/org";
import { writeActiveOrgId } from "@/lib/auth/org-cookie";

export type OrgActionResult =
  | { ok: true; org: SessionOrg }
  | { ok: false; error: string; status: number };

function sessionOrgFromRow(
  org: { id: string; name: string; slug: string; invite_code?: string },
  role: OrgRole,
): SessionOrg {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role,
    invite_code: org.invite_code,
  };
}

export async function lookupPublicOrg(slug: string): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  const normalized = slugifyClubName(slug);
  if (!normalized) return null;

  if (isDemoMode()) {
    const store = await readFileStore();
    return (
      (store.organizations ?? []).find((org) => org.slug === normalized) ?? null
    );
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", normalized)
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, name: data.name, slug: data.slug };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("lookup_org_by_slug", {
    p_slug: normalized,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return { id: row.id, name: row.name, slug: row.slug };
}

export async function createClubForUser(input: {
  userId: string;
  name: unknown;
  request?: Request;
}): Promise<OrgActionResult> {
  const parsed = parseClubName(input.name);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const baseSlug = slugifyClubName(parsed.name);
  const invite = generateInviteCode(baseSlug.replace(/-/g, "").slice(0, 12));

  if (isDemoMode()) {
    const store = await readFileStore();
    const slug = uniqueSlug(
      baseSlug,
      (store.organizations ?? []).map((org) => org.slug),
    );
    const org = {
      id: newId("org"),
      name: parsed.name,
      slug,
      invite_code: invite,
    };
    await updateStore((current) => ({
      ...current,
      organizations: [...(current.organizations ?? []), org],
      memberships: [
        ...(current.memberships ?? []),
        {
          id: newId("mem"),
          org_id: org.id,
          user_id: input.userId,
          role: "owner",
        },
      ],
    }));
    if (input.request) await writeActiveOrgId(org.id, input.request);
    else await writeActiveOrgId(org.id);
    return { ok: true, org: sessionOrgFromRow(org, "owner") };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Auth not configured", status: 500 };
  }

  let slug = baseSlug;
  let lastError = "Could not create club";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.name,
        slug,
        invite_code: attempt === 0 ? invite : generateInviteCode(baseSlug),
      })
      .select("id, name, slug, invite_code")
      .single();
    if (!error && data) {
      const { error: memberError } = await supabase.from("memberships").insert({
        org_id: data.id,
        user_id: input.userId,
        role: "owner",
      });
      if (memberError) {
        return { ok: false, error: memberError.message, status: 400 };
      }
      await supabase.from("org_state").upsert({ org_id: data.id });
      if (input.request) await writeActiveOrgId(data.id, input.request);
      else await writeActiveOrgId(data.id);
      return { ok: true, org: sessionOrgFromRow(data, "owner") };
    }
    lastError = error?.message ?? lastError;
    if (!/duplicate|unique/i.test(error?.message ?? "")) {
      return { ok: false, error: lastError, status: 400 };
    }
    slug = `${baseSlug.slice(0, 46)}-${attempt + 2}`;
  }

  return { ok: false, error: lastError, status: 409 };
}

export async function joinClubByInvite(input: {
  userId: string;
  inviteCode: unknown;
  request?: Request;
}): Promise<OrgActionResult> {
  const parsed = parseInviteCode(input.inviteCode);
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  if (isDemoMode()) {
    const store = await readFileStore();
    const org = (store.organizations ?? []).find(
      (item) => item.invite_code === parsed.code,
    );
    if (!org) {
      return { ok: false, error: "Invalid invite code", status: 404 };
    }
    const already = (store.memberships ?? []).some(
      (membership) =>
        membership.org_id === org.id && membership.user_id === input.userId,
    );
    if (!already) {
      await updateStore((current) => ({
        ...current,
        memberships: [
          ...(current.memberships ?? []),
          {
            id: newId("mem"),
            org_id: org.id,
            user_id: input.userId,
            role: "secretary",
          },
        ],
      }));
    }
    if (input.request) await writeActiveOrgId(org.id, input.request);
    else await writeActiveOrgId(org.id);
    return { ok: true, org: sessionOrgFromRow(org, "secretary") };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Auth not configured", status: 500 };
  }

  const { data, error } = await supabase.rpc("join_org_by_invite", {
    p_code: parsed.code,
  });
  if (error || !data) {
    return {
      ok: false,
      error: /invalid invite/i.test(error?.message ?? "")
        ? "Invalid invite code"
        : (error?.message ?? "Could not join club"),
      status: 404,
    };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, invite_code")
    .eq("id", data)
    .maybeSingle();
  if (!org) {
    return { ok: false, error: "Club not found after join", status: 404 };
  }

  if (input.request) await writeActiveOrgId(org.id, input.request);
  else await writeActiveOrgId(org.id);
  return { ok: true, org: sessionOrgFromRow(org, "secretary") };
}

export async function rotateInviteCode(orgId: string): Promise<OrgActionResult> {
  const invite = generateInviteCode("CLUB");
  if (isDemoMode()) {
    let org: SessionOrg | null = null;
    await updateStore((current) => ({
      ...current,
      organizations: (current.organizations ?? []).map((item) => {
        if (item.id !== orgId) return item;
        org = sessionOrgFromRow({ ...item, invite_code: invite }, "owner");
        return { ...item, invite_code: invite };
      }),
    }));
    if (!org) return { ok: false, error: "Club not found", status: 404 };
    return { ok: true, org };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, error: "Auth not configured", status: 500 };
  }
  const { data, error } = await supabase
    .from("organizations")
    .update({ invite_code: invite })
    .eq("id", orgId)
    .select("id, name, slug, invite_code")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not rotate invite code",
      status: 400,
    };
  }
  return { ok: true, org: sessionOrgFromRow(data, "owner") };
}
