import { isOwnedDogPhotoPath } from "@/lib/domain/dog-photo";
import { entriesForDog, photoSourceForDog } from "@/lib/domain/dog-identity";
import type { AppStore, RosterEntryRecord } from "@/lib/types";

/** Entry that owns the photo file for this appearance, including siblings. */
export function deskEntryForPhoto(
  store: AppStore,
  showId: string,
  entryId: string,
): RosterEntryRecord | null {
  const requested = store.entries.find(
    (item) => item.id === entryId && item.show_id === showId,
  );
  if (!requested) return null;
  const siblings = entriesForDog(
    store.entries.filter((item) => item.show_id === showId),
    requested,
  );
  const entry = photoSourceForDog(siblings, requested);
  if (!entry?.photo_path) return null;
  if (!isOwnedDogPhotoPath(entry.photo_path, showId, entry.id)) return null;
  return entry;
}
