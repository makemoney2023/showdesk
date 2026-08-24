import { samplePublishedStore } from "@/lib/domain/public-results.sample";
import { listPublishedShows } from "@/lib/domain/public-results";
import { isDemoMode } from "@/lib/supabase/config";
import { EMPTY_STORE, type AppStore } from "@/lib/types";
import { readStore as fileReadStore } from "./file-store";
import { sbReadStore, type SupabaseStoreClient } from "./supabase-store";

/**
 * Store snapshot for public /results pages.
 * Uses the service-role client in production so anonymous visitors can
 * read published shows despite authenticated-only RLS.
 * Never returns email, audio, or unpublished critiques — callers must
 * still project through `listPublishedShows` / `getPublishedShow`.
 */
export async function readPublicResultsStore(): Promise<AppStore> {
  if (isDemoMode()) {
    const store = await fileReadStore();
    return listPublishedShows(store).length > 0 ? store : samplePublishedStore();
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return EMPTY_STORE;
  return sbReadStore(admin as unknown as SupabaseStoreClient);
}
