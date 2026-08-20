import { describe, expect, it } from "vitest";
import {
  DOG_PHOTO_MAX_BYTES,
  dogPhotoContentType,
  dogPhotoDownloadFilename,
  dogPhotoHref,
  dogPhotoRelativePath,
  isOwnedDogPhotoPath,
  sniffDogPhotoMime,
  validateDogPhotoUpload,
} from "./dog-photo";

function jpegBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
}

function pngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

describe("dog-photo", () => {
  it("builds a scoped photo URL", () => {
    expect(dogPhotoHref("show-1", "entry-9")).toBe(
      "/api/photos/entry-9?show_id=show-1",
    );
    expect(dogPhotoHref("show-1", "entry-9", { download: true })).toBe(
      "/api/photos/entry-9?show_id=show-1&download=1",
    );
    expect(dogPhotoDownloadFilename("Rex vom Hof", "show-1/entry-9.png")).toBe(
      "Rex-vom-Hof.png",
    );
    expect(dogPhotoRelativePath("show-1", "entry-9", "jpg")).toBe(
      "show-1/entry-9.jpg",
    );
    expect(dogPhotoContentType("show-1/entry-9.png")).toBe("image/png");
  });

  it("sniffs JPEG, PNG, and WebP magic bytes", () => {
    expect(sniffDogPhotoMime(jpegBytes())).toBe("image/jpeg");
    expect(sniffDogPhotoMime(pngBytes())).toBe("image/png");
    expect(
      sniffDogPhotoMime(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
    expect(sniffDogPhotoMime(new Uint8Array([0x00, 0x01]))).toBeNull();
  });

  it("accepts only the owned show/entry object path", () => {
    expect(isOwnedDogPhotoPath("show-1/entry-9.jpg", "show-1", "entry-9")).toBe(
      true,
    );
    expect(isOwnedDogPhotoPath("show-1/entry-9.png", "show-1", "entry-9")).toBe(
      true,
    );
    expect(
      isOwnedDogPhotoPath("../show-1/entry-9.jpg", "show-1", "entry-9"),
    ).toBe(false);
    expect(isOwnedDogPhotoPath("show-1/other.jpg", "show-1", "entry-9")).toBe(
      false,
    );
  });

  it("rejects empty, oversized, and non-image uploads", () => {
    expect(validateDogPhotoUpload({ bytes: new Uint8Array() }).valid).toBe(
      false,
    );
    expect(validateDogPhotoUpload({ bytes: jpegBytes() })).toEqual({
      valid: true,
      mime: "image/jpeg",
      ext: "jpg",
    });
    expect(
      validateDogPhotoUpload({
        bytes: jpegBytes(),
        claimedMime: "image/png",
      }).valid,
    ).toBe(false);
    expect(
      validateDogPhotoUpload({
        bytes: new Uint8Array(DOG_PHOTO_MAX_BYTES + 1),
      }).valid,
    ).toBe(false);
  });
});
