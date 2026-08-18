import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemoMode } from "./config";

/** Server-only service-role client. Returns null in demo or when the key is missing. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (isDemoMode()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
