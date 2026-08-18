import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readStore } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { parseAuthCredentials } from "@/lib/auth/credentials";
import { isDemoMode, getDemoSessionCookieName } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoSessionCookieOptions } from "@/lib/auth/demo-cookie";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

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
    return NextResponse.json({ ok: true, demo: true, user: { email: user.email } });
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
  return NextResponse.json({ ok: true, demo: false });
}

export async function DELETE() {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    cookieStore.delete(getDemoSessionCookieName());
    return NextResponse.json({ ok: true });
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
