import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  deleteDogPhotoFile,
  deleteShowPhotos,
  readDogPhotoFile,
  writeDogPhotoFile,
} from "./photo-store";

describe("photo-store", () => {
  let tmp: string;

  afterEach(async () => {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true });
  });

  it("writes and reads a dog photo", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sss-photo-"));
    const relative = await writeDogPhotoFile({
      showId: "show-1",
      entryId: "entry-1",
      ext: "jpg",
      bytes: Buffer.from([0xff, 0xd8, 0xff]),
      root: tmp,
    });
    expect(relative).toBe("show-1/entry-1.jpg");
    const buf = await readDogPhotoFile(relative, tmp);
    expect(buf[0]).toBe(0xff);
  });

  it("deletes one photo and a show folder", async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sss-photo-"));
    const relative = await writeDogPhotoFile({
      showId: "show-1",
      entryId: "entry-1",
      ext: "png",
      bytes: Buffer.from("x"),
      root: tmp,
    });
    await deleteDogPhotoFile(relative, tmp);
    await expect(readDogPhotoFile(relative, tmp)).rejects.toThrow();
    await writeDogPhotoFile({
      showId: "show-1",
      entryId: "entry-2",
      ext: "jpg",
      bytes: Buffer.from("y"),
      root: tmp,
    });
    await deleteShowPhotos("show-1", tmp);
    await expect(readDogPhotoFile("show-1/entry-2.jpg", tmp)).rejects.toThrow();
  });
});
