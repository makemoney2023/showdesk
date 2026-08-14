import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  deleteShowAudio,
  readCritiqueAudio,
  writeCritiqueAudio,
} from "./audio-store";

describe("audio-store", () => {
  let tmp: string;

  afterEach(async () => {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true });
  });

  it("writes and reads base64 audio roundtrip", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sss-audio-"));
    const payload = Buffer.from("fake-webm-bytes").toString("base64");
    const relative = await writeCritiqueAudio({
      showId: "show-1",
      critiqueId: "crit-1",
      base64: payload,
      root: tmp,
    });
    const buf = await readCritiqueAudio(relative, tmp);
    expect(buf.toString()).toBe("fake-webm-bytes");
  });

  it("deletes show audio directory", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sss-audio-"));
    await writeCritiqueAudio({
      showId: "show-1",
      critiqueId: "crit-1",
      base64: Buffer.from("x").toString("base64"),
      root: tmp,
    });
    await deleteShowAudio("show-1", tmp);
    await expect(readCritiqueAudio("show-1/crit-1.webm", tmp)).rejects.toThrow();
  });
});
