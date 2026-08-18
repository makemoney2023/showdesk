import { isDemoMode } from "@/lib/supabase/config";
import type { AppStore } from "@/lib/types";
import {
  audioExists as fileAudioExists,
  deleteShowAudio as fileDeleteShowAudio,
  readCritiqueAudio as fileReadCritiqueAudio,
  writeCritiqueAudio as fileWriteCritiqueAudio,
} from "./audio-store";
import {
  purgeShowData as filePurgeShowData,
  readStore as fileReadStore,
  updateStore as fileUpdateStore,
  writeStore as fileWriteStore,
} from "./file-store";
import {
  deleteShowAudioObjects,
  readCritiqueAudioBytes,
  writeCritiqueAudioBytes,
  type SupabaseAudioClient,
} from "./supabase-audio";
import {
  sbPurgeShowData,
  sbReadStore,
  sbUpdateStore,
  sbWriteStore,
  type SupabaseStoreClient,
} from "./supabase-store";

export { newId } from "./file-store";
export {
  CRITIQUE_AUDIO_BUCKET,
  critiqueAudioObjectPath,
  deleteShowAudioObjects,
  readCritiqueAudioBytes,
  writeCritiqueAudioBytes,
} from "./supabase-audio";

export type StoreBackend = "file" | "supabase";

type StoreClient = SupabaseStoreClient & SupabaseAudioClient;

export function getStoreBackend(): StoreBackend {
  return isDemoMode() ? "file" : "supabase";
}

async function requireSupabaseClient(): Promise<StoreClient> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const client = await createSupabaseServerClient();
  if (!client) {
    throw new Error("Supabase client unavailable");
  }
  return client as unknown as StoreClient;
}

export async function readStore(): Promise<AppStore> {
  if (getStoreBackend() === "file") return fileReadStore();
  return sbReadStore(await requireSupabaseClient());
}

export async function writeStore(store: AppStore): Promise<void> {
  if (getStoreBackend() === "file") return fileWriteStore(store);
  return sbWriteStore(await requireSupabaseClient(), store);
}

export async function updateStore(
  updater: (store: AppStore) => AppStore | void,
): Promise<AppStore> {
  if (getStoreBackend() === "file") return fileUpdateStore(updater);
  return sbUpdateStore(await requireSupabaseClient(), updater);
}

export async function purgeShowData(showId: string): Promise<AppStore> {
  if (getStoreBackend() === "file") return filePurgeShowData(showId);
  return sbPurgeShowData(await requireSupabaseClient(), showId);
}

export async function writeCritiqueAudio(opts: {
  showId: string;
  critiqueId: string;
  base64: string;
  root?: string;
}): Promise<string> {
  if (getStoreBackend() === "file") return fileWriteCritiqueAudio(opts);
  return writeCritiqueAudioBytes(await requireSupabaseClient(), {
    showId: opts.showId,
    critiqueId: opts.critiqueId,
    bytes: Buffer.from(opts.base64, "base64"),
  });
}

export async function readCritiqueAudio(
  relativePath: string,
  root?: string,
): Promise<Buffer> {
  if (getStoreBackend() === "file") {
    return fileReadCritiqueAudio(relativePath, root);
  }
  return readCritiqueAudioBytes(await requireSupabaseClient(), relativePath);
}

export async function deleteShowAudio(showId: string, root?: string) {
  if (getStoreBackend() === "file") {
    return fileDeleteShowAudio(showId, root);
  }
  return deleteShowAudioObjects(await requireSupabaseClient(), showId);
}

export async function audioExists(
  relativePath: string,
  root?: string,
): Promise<boolean> {
  if (getStoreBackend() === "file") {
    return fileAudioExists(relativePath, root);
  }
  try {
    await readCritiqueAudioBytes(await requireSupabaseClient(), relativePath);
    return true;
  } catch {
    return false;
  }
}
