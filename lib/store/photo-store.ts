import { promises as fs } from "fs";
import path from "path";
import { dogPhotoRelativePath } from "@/lib/domain/dog-photo";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "photos");

export function dogPhotoRootDir(root = DEFAULT_ROOT) {
  return root;
}

function resolveSafePhotoPath(relativePath: string, root: string): string {
  if (!relativePath || relativePath.includes("\0")) {
    throw new Error("invalid photo path");
  }
  const safe = path.normalize(relativePath.replace(/\\/g, "/"));
  if (safe === "." || safe.startsWith("..") || path.isAbsolute(safe)) {
    throw new Error("invalid photo path");
  }
  const full = path.resolve(root, safe);
  const rootResolved = path.resolve(root);
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : `${rootResolved}${path.sep}`;
  if (full === rootResolved || !full.startsWith(prefix)) {
    throw new Error("invalid photo path");
  }
  return full;
}

export async function writeDogPhotoFile(opts: {
  showId: string;
  entryId: string;
  ext: string;
  bytes: Buffer;
  root?: string;
}): Promise<string> {
  if (opts.ext !== "jpg" && opts.ext !== "png" && opts.ext !== "webp") {
    throw new Error("invalid photo path");
  }
  const root = opts.root ?? DEFAULT_ROOT;
  const relative = dogPhotoRelativePath(opts.showId, opts.entryId, opts.ext);
  const full = resolveSafePhotoPath(relative, root);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, opts.bytes);
  return relative;
}

export async function readDogPhotoFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<Buffer> {
  return fs.readFile(resolveSafePhotoPath(relativePath, root));
}

export async function deleteDogPhotoFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<void> {
  await fs.rm(resolveSafePhotoPath(relativePath, root), { force: true });
}

export async function deleteShowPhotos(showId: string, root = DEFAULT_ROOT) {
  await fs.rm(resolveSafePhotoPath(showId, root), { recursive: true, force: true });
}

export async function dogPhotoFileExists(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<boolean> {
  try {
    await fs.access(resolveSafePhotoPath(relativePath, root));
    return true;
  } catch {
    return false;
  }
}
