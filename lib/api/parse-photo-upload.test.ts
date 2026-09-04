import { describe, expect, it } from "vitest";
import { parseDogPhotoUpload } from "./parse-photo-upload";

function jpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

describe("parseDogPhotoUpload", () => {
  it("reads a multipart photo under the Vercel body limit", async () => {
    const form = new FormData();
    form.set("show_id", "show-1");
    form.set("entry_id", "entry-9");
    form.set(
      "photo",
      new File([jpegBytes()], "dog.jpg", { type: "image/jpeg" }),
    );
    const request = new Request("http://local/api/photos", {
      method: "POST",
      body: form,
    });
    const parsed = await parseDogPhotoUpload(request);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.show_id).toBe("show-1");
    expect(parsed.entry_id).toBe("entry-9");
    expect(parsed.mime).toBe("image/jpeg");
    expect(parsed.bytes[0]).toBe(0xff);
    expect(parsed.bytes[1]).toBe(0xd8);
  });

  it("still reads the older JSON/base64 body", async () => {
    const request = new Request("http://local/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: "show-1",
        entry_id: "entry-9",
        photo_base64: Buffer.from(jpegBytes()).toString("base64"),
        mime: "image/jpeg",
      }),
    });
    const parsed = await parseDogPhotoUpload(request);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.entry_id).toBe("entry-9");
    expect(parsed.bytes[0]).toBe(0xff);
  });

  it("rejects a multipart body without a photo", async () => {
    const form = new FormData();
    form.set("show_id", "show-1");
    form.set("entry_id", "entry-9");
    const request = new Request("http://local/api/photos", {
      method: "POST",
      body: form,
    });
    const parsed = await parseDogPhotoUpload(request);
    expect(parsed).toEqual({
      ok: false,
      error: "show_id, entry_id, and photo required",
      status: 400,
    });
  });
});
