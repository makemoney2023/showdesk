import { promises as fs } from "fs";
import path from "path";
import {
  dogPhotoContentType,
  isOwnedDogPhotoPath,
} from "@/lib/domain/dog-photo";
import { entriesForDog, photoSourceForDog } from "@/lib/domain/dog-identity";
import {
  getPublishedShow,
  isShowResultsPublished,
  showResultsSlug,
} from "@/lib/domain/public-results";
import { isDemoMode } from "@/lib/supabase/config";
import type { AppStore, RosterEntryRecord, Show } from "@/lib/types";
import { readDogPhotoFile } from "./photo-store";
import { readPublicResultsStore } from "./public-results";
import { readDogPhotoBytes } from "./supabase-photo";

export const SAMPLE_PHOTO_ROOT = path.join(
  process.cwd(),
  "public",
  "results-sample",
);

export interface PublishedDogPhoto {
  bytes: Buffer;
  contentType: string;
  dogName: string;
  relativePath: string;
}

function publishedShowForId(store: AppStore, showId: string): Show | null {
  const show = store.shows.find((item) => item.id === showId) ?? null;
  if (!show || !isShowResultsPublished(show)) return null;
  return getPublishedShow(store, showResultsSlug(show)) ? show : null;
}

export function publishedEntryForPhoto(
  store: AppStore,
  showId: string,
  entryId: string,
): { show: Show; entry: RosterEntryRecord } | null {
  const show = publishedShowForId(store, showId);
  if (!show) return null;
  const published = getPublishedShow(store, showResultsSlug(show));
  const listedIds = new Set(
    published?.divisions.flatMap((division) =>
      division.dogs.map((dog) => dog.entryId),
    ) ?? [],
  );
  const requested = store.entries.find(
    (item) => item.id === entryId && item.show_id === showId,
  );
  if (!requested) return null;
  const siblings = entriesForDog(
    store.entries.filter((item) => item.show_id === showId),
    requested,
  );
  if (!siblings.some((item) => listedIds.has(item.id))) return null;
  const entry = photoSourceForDog(siblings, requested);
  if (!entry?.photo_path) return null;
  if (!isOwnedDogPhotoPath(entry.photo_path, showId, entry.id)) return null;
  return { show, entry };
}

export async function readBundledSamplePhoto(
  relativePath: string,
): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(SAMPLE_PHOTO_ROOT, relativePath));
  } catch {
    return null;
  }
}

async function readStoredPublicPhoto(relativePath: string): Promise<Buffer | null> {
  if (isDemoMode()) {
    try {
      return await readDogPhotoFile(relativePath);
    } catch {
      return null;
    }
  }

  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  try {
    return await readDogPhotoBytes(admin, relativePath);
  } catch {
    return null;
  }
}

export async function readPublishedDogPhoto(
  showId: string,
  entryId: string,
): Promise<PublishedDogPhoto | null> {
  const store = await readPublicResultsStore();
  const found = publishedEntryForPhoto(store, showId, entryId);
  if (!found) return null;

  const relativePath = found.entry.photo_path!;
  const bytes =
    (await readBundledSamplePhoto(relativePath)) ??
    (await readStoredPublicPhoto(relativePath));
  if (!bytes) return null;

  return {
    bytes,
    contentType: dogPhotoContentType(relativePath),
    dogName: found.entry.dog_name,
    relativePath,
  };
}
