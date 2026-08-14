import { promises as fs } from "fs";
import path from "path";

const DEFAULT_ROOT = path.join(process.cwd(), ".data", "audio");

export function audioRootDir(root = DEFAULT_ROOT) {
  return root;
}

export function critiqueAudioRelativePath(showId: string, critiqueId: string) {
  return path.join(showId, `${critiqueId}.webm`);
}

export async function writeCritiqueAudio(opts: {
  showId: string;
  critiqueId: string;
  base64: string;
  root?: string;
}): Promise<string> {
  const root = opts.root ?? DEFAULT_ROOT;
  const relative = critiqueAudioRelativePath(opts.showId, opts.critiqueId);
  const full = path.join(root, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const buf = Buffer.from(opts.base64, "base64");
  await fs.writeFile(full, buf);
  return relative;
}

export async function readCritiqueAudio(
  relativePath: string,
  root = DEFAULT_ROOT,
): Promise<Buffer> {
  const full = path.join(root, relativePath);
  return fs.readFile(full);
}

export async function deleteShowAudio(showId: string, root = DEFAULT_ROOT) {
  const dir = path.join(root, showId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function audioExists(
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
