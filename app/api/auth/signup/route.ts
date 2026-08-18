import { NextResponse } from "next/server";
import { parseAuthCredentials } from "@/lib/auth/credentials";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Self-serve email signup. Uses the service-role admin API to create an
 * already-confirmed user, then signs them in so cookies are set immediately
 * (no Dashboard user create, no confirm-email hop).
 */
export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "Sign up is only available when Supabase Auth is configured" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const parsed = parseAuthCredentials(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
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

  return NextResponse.json({ ok: true, signedUp: true });
}
