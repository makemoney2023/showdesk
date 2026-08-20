import { describe, expect, it } from "vitest";
import {
  CRITIQUE_AUDIO_BUCKET,
  critiqueAudioExists,
  deleteCritiqueAudioObject,
  deleteShowAudioObjects,
  readCritiqueAudioBytes,
  writeCritiqueAudioBytes,
} from "./supabase-audio";

type StorageError = { message: string } | null;

function createMockStorage(seed: Record<string, Buffer> = {}) {
  const objects = new Map<string, Buffer>(Object.entries(seed));
  const ops: Array<{ op: string; bucket: string; path?: string; paths?: string[] }> =
    [];

  const client = {
    storage: {
      from(bucket: string) {
        return {
          async upload(
            objectPath: string,
            body: Buffer,
            _options?: { contentType?: string; upsert?: boolean },
          ) {
            ops.push({ op: "upload", bucket, path: objectPath });
            objects.set(objectPath, Buffer.from(body));
            return { data: { path: objectPath }, error: null as StorageError };
          },
          async download(objectPath: string) {
            ops.push({ op: "download", bucket, path: objectPath });
            const buf = objects.get(objectPath);
            if (!buf) {
              return {
                data: null,
                error: { message: "not found" } as StorageError,
              };
            }
            return {
              data: {
                arrayBuffer: async () =>
                  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
              },
              error: null as StorageError,
            };
          },
          async list(prefix: string) {
            ops.push({ op: "list", bucket, path: prefix });
            const names = [...objects.keys()]
              .filter((key) => key.startsWith(`${prefix}/`))
              .map((key) => ({ name: key.slice(prefix.length + 1) }));
            return { data: names, error: null as StorageError };
          },
          async remove(paths: string[]) {
            ops.push({ op: "remove", bucket, paths });
            for (const p of paths) objects.delete(p);
            return { data: paths, error: null as StorageError };
          },
        };
      },
    },
  };

  return { client, objects, ops };
}

describe("supabase-audio", () => {
  it("uploads bytes to critique-audio at show_id/critique_id.webm", async () => {
    const { client, objects, ops } = createMockStorage();
    const bytes = Buffer.from("fake-webm-bytes");
    const relative = await writeCritiqueAudioBytes(client, {
      showId: "show-1",
      critiqueId: "crit-1",
      bytes,
    });

    expect(relative).toBe("show-1/crit-1.webm");
    expect(objects.get("show-1/crit-1.webm")?.toString()).toBe("fake-webm-bytes");
    expect(ops[0]).toMatchObject({
      op: "upload",
      bucket: CRITIQUE_AUDIO_BUCKET,
      path: "show-1/crit-1.webm",
    });
  });

  it("downloads bytes from the same relative path", async () => {
    const { client } = createMockStorage({
      "show-1/crit-1.webm": Buffer.from("stored-audio"),
    });
    const buf = await readCritiqueAudioBytes(client, "show-1/crit-1.webm");
    expect(buf.toString()).toBe("stored-audio");
  });

  it("checks existence with list and never downloads the object", async () => {
    const { client, ops } = createMockStorage({
      "show-1/crit-1.webm": Buffer.from("stored-audio"),
    });

    await expect(critiqueAudioExists(client, "show-1/crit-1.webm")).resolves.toBe(
      true,
    );
    await expect(critiqueAudioExists(client, "show-1/missing.webm")).resolves.toBe(
      false,
    );

    expect(ops.filter((op) => op.op === "list")).toHaveLength(2);
    expect(ops.filter((op) => op.op === "download")).toHaveLength(0);
    expect(ops[0]).toMatchObject({
      op: "list",
      bucket: CRITIQUE_AUDIO_BUCKET,
      path: "show-1",
    });
  });

  it("deletes one critique audio object", async () => {
    const { client, objects } = createMockStorage({
      "show-1/crit-1.webm": Buffer.from("a"),
      "show-1/crit-2.webm": Buffer.from("b"),
    });
    await deleteCritiqueAudioObject(client, "show-1/crit-1.webm");
    expect(objects.has("show-1/crit-1.webm")).toBe(false);
    expect(objects.has("show-1/crit-2.webm")).toBe(true);
  });

  it("deletes all objects under a show prefix", async () => {
    const { client, objects } = createMockStorage({
      "show-1/crit-1.webm": Buffer.from("a"),
      "show-1/crit-2.webm": Buffer.from("b"),
      "show-2/crit-9.webm": Buffer.from("keep"),
    });

    await deleteShowAudioObjects(client, "show-1");

    expect(objects.has("show-1/crit-1.webm")).toBe(false);
    expect(objects.has("show-1/crit-2.webm")).toBe(false);
    expect(objects.get("show-2/crit-9.webm")?.toString()).toBe("keep");
  });
});
