import { newId, writeDogDocument } from "@/lib/store";
import {
  DOG_DOCUMENT_MAX_BASE64_CHARS,
  sanitizeDocumentFilename,
  validateDogDocumentUpload,
  type DogDocumentRecord,
} from "@/lib/domain/dog-document";

export interface StagedDogDocument {
  file_base64: string;
  filename?: string;
  mime?: string;
}

export async function persistStagedDogDocuments(input: {
  showId: string;
  dogId: string;
  uploads: StagedDogDocument[];
}): Promise<
  { ok: true; documents: DogDocumentRecord[] } | { ok: false; error: string }
> {
  const documents: DogDocumentRecord[] = [];
  for (const upload of input.uploads) {
    if (!upload.file_base64) continue;
    if (upload.file_base64.length > DOG_DOCUMENT_MAX_BASE64_CHARS) {
      return { ok: false, error: "Document must be 10 MB or smaller" };
    }
    let bytes: Buffer;
    try {
      bytes = Buffer.from(upload.file_base64, "base64");
    } catch {
      return { ok: false, error: "Invalid document data" };
    }
    const validation = validateDogDocumentUpload({
      bytes,
      claimedMime: upload.mime,
      filename: upload.filename,
    });
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }
    const documentId = newId("doc");
    const path = await writeDogDocument({
      showId: input.showId,
      dogId: input.dogId,
      documentId,
      ext: validation.ext,
      bytes,
      contentType: validation.mime,
    });
    documents.push({
      id: documentId,
      show_id: input.showId,
      dog_id: input.dogId,
      path,
      filename: sanitizeDocumentFilename(
        upload.filename ?? "document",
        validation.ext,
      ),
      content_type: validation.mime,
      created_at: new Date().toISOString(),
    });
  }
  return { ok: true, documents };
}
