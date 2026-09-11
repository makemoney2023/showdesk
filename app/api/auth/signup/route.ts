import { NextResponse } from "next/server";
import { parseAuthCredentials } from "@/lib/auth/credentials";
import { getSessionUser } from "@/lib/auth/session";
import { createClubForUser, joinClubByInvite } from "@/lib/auth/org-service";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Self-serve signup. Creates a confirmed user, signs them in, then either
 * provisions a new club or joins one with an invite code.
 */
export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Sign up is only available when Supabase Auth is configured" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    club_name?: string;
    invite_code?: string;
  };
  const parsed = parseAuthCredentials(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (!body.club_name?.trim() && !body.invite_code?.trim()) {
    return NextResponse.json(
      { error: "Create a club or enter an invite code" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Sign up requires SUPABASE_SERVICE_ROLE_KEY on the server" },
      { status: 500 },
    );
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
  });
  if (createError) {
    const status =
      /already|registered|exists/i.test(createError.message) ? 409 : 400;
    return NextResponse.json({ error: createError.message }, { status });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });
  if (signInError) {
    return NextResponse.json(
      { error: signInError.message },
      { status: 401 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Signed up but session missing" }, { status: 500 });
  }

  const provision = body.invite_code?.trim()
    ? await joinClubByInvite({
        userId: user.id,
        inviteCode: body.invite_code,
        request,
      })
    : await createClubForUser({
        userId: user.id,
        name: body.club_name,
        request,
      });
  if (!provision.ok) {
    return NextResponse.json(
      { error: provision.error },
      { status: provision.status },
    );
  }

  const session = await getSessionUser();
  return NextResponse.json({
    ok: true,
    signedUp: true,
    org: provision.org,
    user: session,
  });
}
