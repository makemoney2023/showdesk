import { cookies } from "next/headers";
import { readStore } from "@/lib/store/file-store";
import { isDemoMode, getDemoSessionCookieName } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const session = cookieStore.get(getDemoSessionCookieName())?.value;
    if (!session) return null;
    const store = await readStore();
    const user = store.demo_users.find((u) => u.id === session);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: data.user.user_metadata?.name,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
