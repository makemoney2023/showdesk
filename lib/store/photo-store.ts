import { promises as fs } from "fs";
import path from "path";
import { dogPhotoRelativePath } from "@/lib/domain/dog-photo";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "photos");

export function dogPhotoRootDir(root = DEFAULT_ROOT) {
  return root;
}

export async function writeDogPhotoFile(opts: {
  showId: string;
  entryId: string;
  ext: string;
  bytes: Buffer;
  root?: string;
}): Promise<string> {
  const root = opts.root ?? DEFAULT_ROOT;
  const relative = dogPhotoRelativePath(opts.showId, opts.entryId, opts.ext);
  const full = path.join(root, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, opts.bytes);
  return relative;
}

export async function readDogPhotoFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<Buffer> {
  return fs.readFile(path.join(root, relativePath));
}

export async function deleteDogPhotoFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<void> {
  const safe = path.normalize(relativePath);
  if (safe.startsWith("..") || path.isAbsolute(safe)) {
    throw new Error("invalid photo path");
  }
  await fs.rm(path.join(root, safe), { force: true });
}

export async function deleteShowPhotos(showId: string, root = DEFAULT_ROOT) {
  await fs.rm(path.join(root, showId), { recursive: true, force: true });
}

export async function dogPhotoFileExists(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<boolean> {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}
