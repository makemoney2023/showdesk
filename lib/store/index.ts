import { dogPhotoRelativePath } from "@/lib/domain/dog-photo";
import {
  DEMO_WRITES_BLOCKED_MESSAGE,
  demoWritesBlocked,
  isDemoMode,
} from "@/lib/supabase/config";
import type { AppStore } from "@/lib/types";
import {
  audioExists as fileAudioExists,
  deleteCritiqueAudioFile,
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
  critiqueAudioExists,
  deleteCritiqueAudioObject,
  deleteShowAudioObjects,
  readCritiqueAudioBytes,
  writeCritiqueAudioBytes,
  type SupabaseAudioClient,
} from "./supabase-audio";
import {
  deleteDogPhotoFile,
  deleteShowPhotos as fileDeleteShowPhotos,
  dogPhotoFileExists,
  readDogPhotoFile,
  writeDogPhotoFile,
} from "./photo-store";
import {
  deleteDogPhotoObject,
  deleteShowPhotoObjects,
  dogPhotoExists as supabaseDogPhotoExists,
  readDogPhotoBytes,
  writeDogPhotoBytes,
  type SupabasePhotoClient,
} from "./supabase-photo";
import {
  deleteDogDocumentFile,
  readDogDocumentFile,
  writeDogDocumentFile,
} from "./document-store";
import {
  deleteDogDocumentObject,
  readDogDocumentBytes,
  writeDogDocumentBytes,
  type SupabaseDocumentClient,
} from "./supabase-document";
import { dogDocumentRelativePath } from "@/lib/domain/dog-document";
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
  critiqueAudioExists,
  critiqueAudioObjectPath,
  deleteShowAudioObjects,
  readCritiqueAudioBytes,
  writeCritiqueAudioBytes,
} from "./supabase-audio";

export type StoreBackend = "file" | "supabase";

type StoreClient = SupabaseStoreClient &
  SupabaseAudioClient &
  SupabasePhotoClient &
  SupabaseDocumentClient;

export function getStoreBackend(): StoreBackend {
  return isDemoMode() ? "file" : "supabase";
}

function assertDemoWritesAllowed() {
  if (demoWritesBlocked()) {
    throw new Error(DEMO_WRITES_BLOCKED_MESSAGE);
  }
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
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") return fileWriteStore(store);
  return sbWriteStore(await requireSupabaseClient(), store);
}

export async function updateStore(
  updater: (store: AppStore) => AppStore | void,
): Promise<AppStore> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") return fileUpdateStore(updater);
  return sbUpdateStore(await requireSupabaseClient(), updater);
}

export async function purgeShowData(showId: string): Promise<AppStore> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") return filePurgeShowData(showId);
  return sbPurgeShowData(await requireSupabaseClient(), showId);
}

export async function writeCritiqueAudio(opts: {
  showId: string;
  critiqueId: string;
  base64: string;
  root?: string;
}): Promise<string> {
  assertDemoWritesAllowed();
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
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") {
    return fileDeleteShowAudio(showId, root);
  }
  return deleteShowAudioObjects(await requireSupabaseClient(), showId);
}

export async function deleteCritiqueAudio(
  relativePath: string,
  root?: string,
): Promise<void> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") {
    return deleteCritiqueAudioFile(relativePath, root);
  }
  return deleteCritiqueAudioObject(
    await requireSupabaseClient(),
    relativePath,
  );
}

export async function audioExists(
  relativePath: string,
  root?: string,
): Promise<boolean> {
  if (getStoreBackend() === "file") {
    return fileAudioExists(relativePath, root);
  }
  try {
    return critiqueAudioExists(await requireSupabaseClient(), relativePath);
  } catch {
    return false;
  }
}

export async function writeDogPhoto(opts: {
  showId: string;
  entryId: string;
  ext: string;
  bytes: Buffer;
  contentType: string;
  root?: string;
}): Promise<string> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") return writeDogPhotoFile(opts);
  return writeDogPhotoBytes(await requireSupabaseClient(), {
    objectPath: dogPhotoRelativePath(opts.showId, opts.entryId, opts.ext),
    bytes: opts.bytes,
    contentType: opts.contentType,
  });
}

export async function readDogPhoto(
  relativePath: string,
  root?: string,
): Promise<Buffer> {
  if (getStoreBackend() === "file") {
    return readDogPhotoFile(relativePath, root);
  }
  return readDogPhotoBytes(await requireSupabaseClient(), relativePath);
}

export async function deleteDogPhoto(
  relativePath: string,
  root?: string,
): Promise<void> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") {
    return deleteDogPhotoFile(relativePath, root);
  }
  return deleteDogPhotoObject(await requireSupabaseClient(), relativePath);
}

export async function deleteShowPhotos(showId: string, root?: string) {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") {
    return fileDeleteShowPhotos(showId, root);
  }
  return deleteShowPhotoObjects(await requireSupabaseClient(), showId);
}

export async function writeDogDocument(opts: {
  showId: string;
  dogId: string;
  documentId: string;
  ext: string;
  bytes: Buffer;
  contentType: string;
  root?: string;
}): Promise<string> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") return writeDogDocumentFile(opts);
  return writeDogDocumentBytes(await requireSupabaseClient(), {
    objectPath: dogDocumentRelativePath(
      opts.showId,
      opts.dogId,
      opts.documentId,
      opts.ext,
    ),
    bytes: opts.bytes,
    contentType: opts.contentType,
  });
}

export async function readDogDocument(
  relativePath: string,
  root?: string,
): Promise<Buffer> {
  if (getStoreBackend() === "file") {
    return readDogDocumentFile(relativePath, root);
  }
  return readDogDocumentBytes(await requireSupabaseClient(), relativePath);
}

export async function deleteDogDocument(
  relativePath: string,
  root?: string,
): Promise<void> {
  assertDemoWritesAllowed();
  if (getStoreBackend() === "file") {
    return deleteDogDocumentFile(relativePath, root);
  }
  return deleteDogDocumentObject(await requireSupabaseClient(), relativePath);
}

export async function photoExists(
  relativePath: string,
  root?: string,
): Promise<boolean> {
  if (getStoreBackend() === "file") {
    return dogPhotoFileExists(relativePath, root);
  }
  try {
    return supabaseDogPhotoExists(await requireSupabaseClient(), relativePath);
  } catch {
    return false;
  }
}
