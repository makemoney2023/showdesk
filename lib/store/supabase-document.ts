export const DOG_DOCUMENT_BUCKET = "dog-documents";

type StorageError = { message: string } | null | undefined;

export interface SupabaseDocumentClient {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Buffer | Uint8Array | ArrayBuffer | Blob,
        options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ data: unknown; error: StorageError }>;
      download(path: string): Promise<{
        data: { arrayBuffer(): Promise<ArrayBuffer> } | null;
        error: StorageError;
      }>;
      remove(paths: string[]): Promise<{ data: unknown; error: StorageError }>;
    };
  };
}

function throwIfError(error: StorageError, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function writeDogDocumentBytes(
  client: SupabaseDocumentClient,
  opts: {
    objectPath: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<string> {
  const { error } = await client.storage
    .from(DOG_DOCUMENT_BUCKET)
    .upload(opts.objectPath, opts.bytes, {
      contentType: opts.contentType,
      upsert: true,
    });
  throwIfError(error, "upload dog document");
  return opts.objectPath;
}

export async function readDogDocumentBytes(
  client: SupabaseDocumentClient,
  relativePath: string,
): Promise<Buffer> {
  const { data, error } = await client.storage
    .from(DOG_DOCUMENT_BUCKET)
    .download(relativePath);
  throwIfError(error, "download dog document");
  if (!data) throw new Error("download dog document: empty object");
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteDogDocumentObject(
  client: SupabaseDocumentClient,
  relativePath: string,
): Promise<void> {
  const { error } = await client.storage
    .from(DOG_DOCUMENT_BUCKET)
    .remove([relativePath]);
  throwIfError(error, "delete dog document");
}
