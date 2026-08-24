import { samplePublishedStore } from "@/lib/domain/public-results.sample";
import { listPublishedShows } from "@/lib/domain/public-results";
import { isDemoMode, isVercelPreview } from "@/lib/supabase/config";
import { EMPTY_STORE, type AppStore } from "@/lib/types";
import { readStore as fileReadStore } from "./file-store";
import { sbReadStore, type SupabaseStoreClient } from "./supabase-store";

/**
 * True when the public archive should show the TNRK sample catalog.
 * Demo and Vercel previews need indexable pages before a real show is published.
 * Production stays empty until a club publishes.
 */
export function shouldUseSampleResults(publishedCount: number): boolean {
  if (publishedCount > 0) return false;
  return isDemoMode() || isVercelPreview();
}

/**
 * Store snapshot for public /results pages.
 * Uses the service-role client in production so anonymous visitors can
 * read published shows despite authenticated-only RLS.
 * Never returns email, audio, or unpublished critiques — callers must
 * still project through `listPublishedShows` / `getPublishedShow`.
 */
export async function readPublicResultsStore(): Promise<AppStore> {
  const store = await readLivePublicStore();
  if (shouldUseSampleResults(listPublishedShows(store).length)) {
    return samplePublishedStore();
  }
  return store;
}

async function readLivePublicStore(): Promise<AppStore> {
  if (isDemoMode()) return fileReadStore();

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return EMPTY_STORE;
  return sbReadStore(admin as unknown as SupabaseStoreClient);
}
