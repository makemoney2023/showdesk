export const DOG_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** Phone camera originals before we shrink them for the desk. */
export const DOG_PHOTO_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
/** Stay under Vercel’s ~4.5 MB request body after multipart encoding. */
export const DOG_PHOTO_WIRE_MAX_BYTES = 2 * 1024 * 1024;
export const DOG_PHOTO_MAX_EDGE = 1600;
export const DOG_PHOTO_JPEG_QUALITY = 0.82;

/** Scale a photo so the long edge fits on the official sheet preview. */
export function scaledDogPhotoSize(
  width: number,
  height: number,
  maxEdge = DOG_PHOTO_MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export const DOG_PHOTO_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type DogPhotoMime = keyof typeof DOG_PHOTO_MIME_TO_EXT;

export function dogPhotoHref(
  showId: string,
  entryId: string,
  opts?: { download?: boolean; cacheBust?: string | number },
): string {
  const params = new URLSearchParams({ show_id: showId });
  if (opts?.download) params.set("download", "1");
  if (opts?.cacheBust != null && String(opts.cacheBust).length > 0) {
    params.set("v", String(opts.cacheBust));
  }
  return `/api/photos/${encodeURIComponent(entryId)}?${params.toString()}`;
}

/** Anonymous URL for a published show result photo. Unpublished shows 404. */
export function publicDogPhotoHref(
  showId: string,
  entryId: string,
  opts?: { cacheBust?: string | number },
): string {
  const params = new URLSearchParams({ show_id: showId });
  if (opts?.cacheBust != null && String(opts.cacheBust).length > 0) {
    params.set("v", String(opts.cacheBust));
  }
  return `/api/public/photos/${encodeURIComponent(entryId)}?${params.toString()}`;
}

export function dogPhotoDownloadFilename(
  dogName: string,
  relativePath: string,
): string {
  const ext = relativePath.split(".").pop()?.toLowerCase();
  const safeExt = ext === "png" || ext === "webp" ? ext : "jpg";
  const stem = dogName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${stem || "dog"}.${safeExt}`;
}

export function dogPhotoRelativePath(
  showId: string,
  entryId: string,
  ext: string,
): string {
  return `${showId}/${entryId}.${ext}`;
}

/** True when the stored object belongs to this show + dog (blocks path tricks). */
export function isOwnedDogPhotoPath(
  relativePath: string,
  showId: string,
  entryId: string,
): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return false;
  return (["jpg", "png", "webp"] as const).some(
    (ext) => normalized === dogPhotoRelativePath(showId, entryId, ext),
  );
}

export const DOG_PHOTO_MAX_BASE64_CHARS = Math.ceil(
  (DOG_PHOTO_MAX_BYTES * 4) / 3,
) + 8;

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
