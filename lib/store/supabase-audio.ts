export const CRITIQUE_AUDIO_BUCKET = "critique-audio";

type StorageError = { message: string } | null | undefined;

/** Duck-typed storage subset used by critique audio helpers. */
export interface SupabaseAudioClient {
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

export function critiqueAudioObjectPath(showId: string, critiqueId: string) {
  return `${showId}/${critiqueId}.webm`;
}

function throwIfError(error: StorageError, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function writeCritiqueAudioBytes(
  client: SupabaseAudioClient,
  opts: { showId: string; critiqueId: string; bytes: Buffer },
): Promise<string> {
  const objectPath = critiqueAudioObjectPath(opts.showId, opts.critiqueId);
  const { error } = await client.storage
    .from(CRITIQUE_AUDIO_BUCKET)
    .upload(objectPath, opts.bytes, {
      contentType: "audio/webm",
      upsert: true,
    });
  throwIfError(error, "upload critique audio");
  return objectPath;
}

export async function readCritiqueAudioBytes(
  client: SupabaseAudioClient,
  relativePath: string,
): Promise<Buffer> {
  const { data, error } = await client.storage
    .from(CRITIQUE_AUDIO_BUCKET)
    .download(relativePath);
  throwIfError(error, "download critique audio");
  if (!data) throw new Error("download critique audio: empty object");
  return Buffer.from(await data.arrayBuffer());
}

export async function critiqueAudioExists(
  client: SupabaseAudioClient,
  relativePath: string,
): Promise<boolean> {
  const slash = relativePath.lastIndexOf("/");
  const prefix = slash === -1 ? "" : relativePath.slice(0, slash);
  const name = slash === -1 ? relativePath : relativePath.slice(slash + 1);
  const { data, error } = await client.storage
    .from(CRITIQUE_AUDIO_BUCKET)
    .list(prefix);
  throwIfError(error, "list critique audio");
  return (data ?? []).some((file) => file.name === name);
}

export async function deleteShowAudioObjects(
  client: SupabaseAudioClient,
  showId: string,
): Promise<void> {
  const { data, error } = await client.storage
    .from(CRITIQUE_AUDIO_BUCKET)
    .list(showId);
  throwIfError(error, "list critique audio");
  const paths = (data ?? [])
    .map((file) => file.name)
    .filter((name) => name.length > 0)
    .map((name) => `${showId}/${name}`);
  if (paths.length === 0) return;
  const removed = await client.storage
    .from(CRITIQUE_AUDIO_BUCKET)
    .remove(paths);
  throwIfError(removed.error, "delete critique audio");
}
