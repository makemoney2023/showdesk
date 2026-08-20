export const DOG_PHOTO_BUCKET = "dog-photos";

type StorageError = { message: string } | null | undefined;

export interface SupabasePhotoClient {
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
      list(prefix?: string): Promise<{
        data: { name: string }[] | null;
        error: StorageError;
      }>;
      remove(paths: string[]): Promise<{ data: unknown; error: StorageError }>;
    };
  };
}

function throwIfError(error: StorageError, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function writeDogPhotoBytes(
  client: SupabasePhotoClient,
  opts: {
    objectPath: string;
    bytes: Buffer;
    contentType: string;
  },
): Promise<string> {
  const { error } = await client.storage
    .from(DOG_PHOTO_BUCKET)
    .upload(opts.objectPath, opts.bytes, {
      contentType: opts.contentType,
      upsert: true,
    });
  throwIfError(error, "upload dog photo");
  return opts.objectPath;
}

export async function readDogPhotoBytes(
  client: SupabasePhotoClient,
  relativePath: string,
): Promise<Buffer> {
  const { data, error } = await client.storage
    .from(DOG_PHOTO_BUCKET)
    .download(relativePath);
  throwIfError(error, "download dog photo");
  if (!data) throw new Error("download dog photo: empty object");
  return Buffer.from(await data.arrayBuffer());
}

export async function dogPhotoExists(
  client: SupabasePhotoClient,
  relativePath: string,
): Promise<boolean> {
  const slash = relativePath.lastIndexOf("/");
  const prefix = slash === -1 ? "" : relativePath.slice(0, slash);
  const name = slash === -1 ? relativePath : relativePath.slice(slash + 1);
  const { data, error } = await client.storage
    .from(DOG_PHOTO_BUCKET)
    .list(prefix);
  throwIfError(error, "list dog photos");
  return (data ?? []).some((file) => file.name === name);
}

export async function deleteDogPhotoObject(
  client: SupabasePhotoClient,
  relativePath: string,
): Promise<void> {
  const { error } = await client.storage
    .from(DOG_PHOTO_BUCKET)
    .remove([relativePath]);
  throwIfError(error, "delete dog photo");
}

export async function deleteShowPhotoObjects(
  client: SupabasePhotoClient,
  showId: string,
): Promise<void> {
  const { data, error } = await client.storage
    .from(DOG_PHOTO_BUCKET)
    .list(showId);
  throwIfError(error, "list dog photos");
  const paths = (data ?? [])
    .map((file) => file.name)
    .filter((name) => name.length > 0)
    .map((name) => `${showId}/${name}`);
  if (paths.length === 0) return;
  const removed = await client.storage.from(DOG_PHOTO_BUCKET).remove(paths);
  throwIfError(removed.error, "delete dog photos");
}
