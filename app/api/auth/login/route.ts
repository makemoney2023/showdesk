import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { parseAuthCredentials } from "@/lib/auth/credentials";
import { slugifyClubName } from "@/lib/auth/org";
import { clearActiveOrgId, writeActiveOrgId } from "@/lib/auth/org-cookie";
import { isDemoMode, getDemoSessionCookieName } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoSessionCookieOptions } from "@/lib/auth/demo-cookie";
import { readStore } from "@/lib/store/file-store";

async function activateRequestedOrg(
  request: Request,
  slug?: string | null,
): Promise<ReturnType<typeof getSessionUser>> {
  const user = await getSessionUser();
  if (!user) return null;

  const wanted = slug ? slugifyClubName(slug) : "";
  const match = wanted
    ? user.orgs.find((org) => org.slug === wanted)
    : null;
  if (wanted && !match) {
    return user;
  }
  const org = match ?? (user.orgs.length === 1 ? user.orgs[0] : user.org);
  if (org) {
    await writeActiveOrgId(org.id, request);
    return getSessionUser();
  }
  return user;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    user,
    needsClub: user.orgs.length === 0,
    needsClubSelect: user.orgs.length > 1 && !user.org,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    slug?: string;
  };

  if (isDemoMode()) {
    const store = await readStore();
    const user = store.demo_users.find(
      (u) => u.email === body.email && u.password === body.password,
    );
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const cookieStore = await cookies();
    cookieStore.set(
      getDemoSessionCookieName(),
      user.id,
      demoSessionCookieOptions(request),
    );
    const session = await activateRequestedOrg(request, body.slug);
    if (body.slug && session && !session.orgs.some((org) => org.slug === slugifyClubName(body.slug!))) {
      return NextResponse.json(
        { error: "That account is not a member of this club" },
        { status: 403 },
      );
    }
    return NextResponse.json({
      ok: true,
      demo: true,
      user: session,
      needsClub: (session?.orgs.length ?? 0) === 0,
      needsClubSelect: (session?.orgs.length ?? 0) > 1 && !session?.org,
    });
  }

  const parsed = parseAuthCredentials(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const session = await activateRequestedOrg(request, body.slug);
  if (
    body.slug &&
    session &&
    !session.orgs.some((org) => org.slug === slugifyClubName(body.slug!))
  ) {
    return NextResponse.json(
      { error: "That account is not a member of this club" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    demo: false,
    user: session,
    needsClub: (session?.orgs.length ?? 0) === 0,
    needsClubSelect: (session?.orgs.length ?? 0) > 1 && !session?.org,
  });
}

export async function DELETE() {
  await clearActiveOrgId();
  if (isDemoMode()) {
    const cookieStore = await cookies();
    cookieStore.delete(getDemoSessionCookieName());
    return NextResponse.json({ ok: true });
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
