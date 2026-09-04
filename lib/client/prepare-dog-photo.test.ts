import { describe, expect, it } from "vitest";
import { assertDogPhotoSource } from "./prepare-dog-photo";
import { DOG_PHOTO_MAX_SOURCE_BYTES } from "@/lib/domain/dog-photo";

describe("assertDogPhotoSource", () => {
  it("rejects HEIC and oversized originals", () => {
    expect(() =>
      assertDogPhotoSource(
        new File([new Uint8Array(8)], "dog.heic", { type: "image/heic" }),
      ),
    ).toThrow(/HEIC/i);
    expect(() =>
      assertDogPhotoSource(
        new File(
          [new Uint8Array(DOG_PHOTO_MAX_SOURCE_BYTES + 1)],
          "dog.jpg",
          { type: "image/jpeg" },
        ),
      ),
    ).toThrow(/20 MB/i);
  });

  it("allows a JPEG the desk can shrink", () => {
    expect(() =>
      assertDogPhotoSource(
        new File([new Uint8Array([0xff, 0xd8, 0xff])], "dog.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).not.toThrow();
  });
});
