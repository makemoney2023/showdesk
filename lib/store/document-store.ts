import { promises as fs } from "fs";
import path from "path";
import { dogDocumentRelativePath } from "@/lib/domain/dog-document";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "documents");

function resolveSafeDocumentPath(relativePath: string, root: string): string {
  if (!relativePath || relativePath.includes("\0")) {
    throw new Error("invalid document path");
  }
  const safe = path.normalize(relativePath.replace(/\\/g, "/"));
  if (safe === "." || safe.startsWith("..") || path.isAbsolute(safe)) {
    throw new Error("invalid document path");
  }
  const full = path.resolve(root, safe);
  const rootResolved = path.resolve(root);
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : `${rootResolved}${path.sep}`;
  if (full === rootResolved || !full.startsWith(prefix)) {
    throw new Error("invalid document path");
  }
  return full;
}

export async function writeDogDocumentFile(opts: {
  showId: string;
  dogId: string;
  documentId: string;
  ext: string;
  bytes: Buffer;
  root?: string;
}): Promise<string> {
  const root = opts.root ?? DEFAULT_ROOT;
  const relative = dogDocumentRelativePath(
    opts.showId,
    opts.dogId,
    opts.documentId,
    opts.ext,
  );
  const full = resolveSafeDocumentPath(relative, root);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, opts.bytes);
  return relative;
}

export async function readDogDocumentFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<Buffer> {
  return fs.readFile(resolveSafeDocumentPath(relativePath, root));
}

export async function deleteDogDocumentFile(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<void> {
  await fs.rm(resolveSafeDocumentPath(relativePath, root), { force: true });
}
