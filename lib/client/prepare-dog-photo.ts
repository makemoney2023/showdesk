import {
  DOG_PHOTO_JPEG_QUALITY,
  DOG_PHOTO_MAX_EDGE,
  DOG_PHOTO_MAX_SOURCE_BYTES,
  DOG_PHOTO_WIRE_MAX_BYTES,
  scaledDogPhotoSize,
} from "@/lib/domain/dog-photo";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function assertDogPhotoSource(file: File): void {
  if (file.size > DOG_PHOTO_MAX_SOURCE_BYTES) {
    throw new Error("Photo must be 20 MB or smaller (JPEG, PNG, or WebP).");
  }
  const claimed = file.type.toLowerCase();
  if (claimed && !ALLOWED_TYPES.has(claimed)) {
    throw new Error(
      "Use JPEG, PNG, or WebP. iPhone HEIC photos need to be saved as JPEG.",
    );
  }
}

/** Shrink a phone photo so the upload stays under the Vercel body limit. */
export async function prepareDogPhotoFile(file: File): Promise<File> {
  assertDogPhotoSource(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that photo. Use JPEG, PNG, or WebP.");
  }

  const size = scaledDogPhotoSize(
    bitmap.width,
    bitmap.height,
    DOG_PHOTO_MAX_EDGE,
  );
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare photo");
  }
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  const blob = await canvasToJpeg(canvas, DOG_PHOTO_JPEG_QUALITY);
  if (blob.size <= DOG_PHOTO_WIRE_MAX_BYTES) {
    return new File([blob], "dog.jpg", { type: "image/jpeg" });
  }
  const smaller = await canvasToJpeg(canvas, 0.6);
  if (smaller.size > DOG_PHOTO_WIRE_MAX_BYTES) {
    throw new Error(
      "Photo is still too large after shrinking. Try a different picture.",
    );
  }
  return new File([smaller], "dog.jpg", { type: "image/jpeg" });
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not prepare photo"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}
