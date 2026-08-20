export const DOG_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const DOG_PHOTO_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type DogPhotoMime = keyof typeof DOG_PHOTO_MIME_TO_EXT;

export function dogPhotoHref(showId: string, entryId: string): string {
  return `/api/photos/${encodeURIComponent(entryId)}?show_id=${encodeURIComponent(showId)}`;
}

export function dogPhotoRelativePath(
  showId: string,
  entryId: string,
  ext: string,
): string {
  return `${showId}/${entryId}.${ext}`;
}

export function dogPhotoContentType(relativePath: string): string {
  const ext = relativePath.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function sniffDogPhotoMime(bytes: Uint8Array): DogPhotoMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateDogPhotoUpload(input: {
  bytes: Uint8Array;
  claimedMime?: string | null;
}): { valid: true; mime: DogPhotoMime; ext: string } | { valid: false; error: string } {
  if (input.bytes.byteLength === 0) {
    return { valid: false, error: "Photo is empty" };
  }
  if (input.bytes.byteLength > DOG_PHOTO_MAX_BYTES) {
    return { valid: false, error: "Photo must be 5 MB or smaller" };
  }
  const sniffed = sniffDogPhotoMime(input.bytes);
  if (!sniffed) {
    return { valid: false, error: "Photo must be JPEG, PNG, or WebP" };
  }
  const claimed = (input.claimedMime ?? "").toLowerCase();
  if (claimed && claimed !== sniffed && !(claimed === "image/jpg" && sniffed === "image/jpeg")) {
    return { valid: false, error: "Photo type does not match the file" };
  }
  return {
    valid: true,
    mime: sniffed,
    ext: DOG_PHOTO_MIME_TO_EXT[sniffed],
  };
}
