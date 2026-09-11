import { cache } from "react";
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

/** Share one live snapshot across a build / serverless instance. */
const LIVE_STORE_TTL_MS = 30_000;

let liveStorePromise: Promise<AppStore> | null = null;
let liveStoreAt = 0;

export function resetPublicResultsStoreCache() {
  liveStorePromise = null;
  liveStoreAt = 0;
}

async function readLivePublicStoreUncached(): Promise<AppStore> {
  if (isDemoMode()) return fileReadStore();

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return EMPTY_STORE;
  return sbReadStore(admin as unknown as SupabaseStoreClient);
}

async function readLivePublicStore(): Promise<AppStore> {
  const now = Date.now();
  if (liveStorePromise && now - liveStoreAt < LIVE_STORE_TTL_MS) {
    return liveStorePromise;
  }

  const pending = readLivePublicStoreUncached().catch((error: unknown) => {
    if (liveStorePromise === pending) {
      liveStorePromise = null;
    }
    console.error("Failed to read public results store", error);
    return EMPTY_STORE;
  });
  liveStoreAt = now;
  liveStorePromise = pending;
  return pending;
}

/**
 * Store snapshot for public /results pages.
 * Uses the service-role client in production so anonymous visitors can
 * read published shows despite authenticated-only RLS.
 * Never returns email, audio, or unpublished critiques — callers must
 * still project through `listPublishedShows` / `getPublishedShow`.
 *
 * React `cache` dedupes metadata + page + OG in one render. The process
 * memo above also reuses one snapshot across the many static pages Next
 * prerenders in a single build worker (React cache is per-request only).
 */
export const readPublicResultsStore = cache(async (): Promise<AppStore> => {
  const store = await readLivePublicStore();
  if (shouldUseSampleResults(listPublishedShows(store).length)) {
    return samplePublishedStore();
  }
  return store;
});
