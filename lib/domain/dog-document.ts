export const DOG_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const DOG_DOCUMENT_MIME_TO_EXT = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type DogDocumentMime = keyof typeof DOG_DOCUMENT_MIME_TO_EXT;

export interface DogDocumentRecord {
  id: string;
  show_id: string;
  dog_id: string;
  path: string;
  filename: string;
  content_type: DogDocumentMime;
  created_at: string;
}

export function dogDocumentRelativePath(
  showId: string,
  dogId: string,
  documentId: string,
  ext: string,
): string {
  return `${showId}/docs/${dogId}/${documentId}.${ext}`;
}

export function isOwnedDogDocumentPath(
  relativePath: string,
  showId: string,
  dogId: string,
  documentId: string,
): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return false;
  return (["pdf", "jpg", "png", "webp"] as const).some(
    (ext) =>
      normalized === dogDocumentRelativePath(showId, dogId, documentId, ext),
  );
}

export function publicDogDocumentHref(
  showId: string,
  documentId: string,
): string {
  return `/api/public/documents/${encodeURIComponent(documentId)}?show_id=${encodeURIComponent(showId)}`;
}

export function dogDocumentHref(
  showId: string,
  documentId: string,
): string {
  return `/api/documents/${encodeURIComponent(documentId)}?show_id=${encodeURIComponent(showId)}`;
}

export const DOG_DOCUMENT_MAX_BASE64_CHARS =
  Math.ceil((DOG_DOCUMENT_MAX_BYTES * 4) / 3) + 8;

export function sniffDogDocumentMime(
  bytes: Uint8Array,
): DogDocumentMime | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
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

export function validateDogDocumentUpload(input: {
  bytes: Uint8Array;
  claimedMime?: string | null;
  filename?: string;
}):
  | { valid: true; mime: DogDocumentMime; ext: string }
  | { valid: false; error: string } {
  if (input.bytes.byteLength === 0) {
    return { valid: false, error: "Document is empty" };
  }
  if (input.bytes.byteLength > DOG_DOCUMENT_MAX_BYTES) {
    return { valid: false, error: "Document must be 10 MB or smaller" };
  }
  const sniffed = sniffDogDocumentMime(input.bytes);
  if (!sniffed) {
    return { valid: false, error: "Document must be PDF, JPEG, PNG, or WebP" };
  }
  const claimed = (input.claimedMime ?? "").toLowerCase();
  if (
    claimed &&
    claimed !== sniffed &&
    !(claimed === "image/jpg" && sniffed === "image/jpeg")
  ) {
    return { valid: false, error: "Document type does not match the file" };
  }
  return {
    valid: true,
    mime: sniffed,
    ext: DOG_DOCUMENT_MIME_TO_EXT[sniffed],
  };
}

/** Health PDFs are optional for SE create and completion. */
export function seDocumentRequirementError(_input: {
  hasPdf?: boolean;
  filenames?: string[];
  contentTypes?: string[];
}): string | null {
  return null;
}

export function documentsIncludeHealthPdf(
  documents: Array<{ show_id: string; dog_id: string; content_type: string }>,
  showId: string,
  dogId: string,
): boolean {
  return documents.some(
    (document) =>
      document.show_id === showId &&
      document.dog_id === dogId &&
      document.content_type === "application/pdf",
  );
}

export function sanitizeDocumentFilename(filename: string, ext: string): string {
  const stem = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${stem || "document"}.${ext}`;
}
