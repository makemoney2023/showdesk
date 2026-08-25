import {
  getPublishedShow,
  isShowResultsPublished,
  showResultsSlug,
} from "@/lib/domain/public-results";
import { isOwnedDogDocumentPath } from "@/lib/domain/dog-document";
import { isDemoMode } from "@/lib/supabase/config";
import type { AppStore, Show } from "@/lib/types";
import type { DogDocumentRecord } from "@/lib/domain/dog-document";
import { readDogDocumentFile } from "./document-store";
import { readPublicResultsStore } from "./public-results";
import { readDogDocumentBytes } from "./supabase-document";

export interface PublishedDogDocument {
  bytes: Buffer;
  document: DogDocumentRecord;
}

function publishedShowForId(store: AppStore, showId: string): Show | null {
  const show = store.shows.find((item) => item.id === showId) ?? null;
  if (!show || !isShowResultsPublished(show)) return null;
  return getPublishedShow(store, showResultsSlug(show)) ? show : null;
}

export async function readPublishedDogDocument(
  showId: string,
  documentId: string,
): Promise<PublishedDogDocument | null> {
  const store = await readPublicResultsStore();
  if (!publishedShowForId(store, showId)) return null;
  const document = (store.dog_documents ?? []).find(
    (item) => item.id === documentId && item.show_id === showId,
  );
  if (
    !document ||
    !isOwnedDogDocumentPath(document.path, showId, document.dog_id, document.id)
  ) {
    return null;
  }

  try {
    const bytes = isDemoMode()
      ? await readDogDocumentFile(document.path)
      : await readLiveDocument(document.path);
    if (!bytes) return null;
    return { bytes, document };
  } catch {
    return null;
  }
}

async function readLiveDocument(relativePath: string): Promise<Buffer | null> {
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  return readDogDocumentBytes(admin, relativePath);
}
