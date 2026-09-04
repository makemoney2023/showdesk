import { readJsonBody } from "@/lib/api/read-json";
import { DOG_PHOTO_MAX_BASE64_CHARS } from "@/lib/domain/dog-photo";

export type ParsedDogPhotoUpload =
  | {
      ok: true;
      show_id: string;
      entry_id: string;
      bytes: Buffer;
      mime?: string;
    }
  | { ok: false; error: string; status: number };

/** Accept multipart (preferred) or the older JSON/base64 body. */
export async function parseDogPhotoUpload(
  request: Request,
): Promise<ParsedDogPhotoUpload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return parseMultipartPhoto(request);
  }
  return parseJsonPhoto(request);
}

async function parseMultipartPhoto(
  request: Request,
): Promise<ParsedDogPhotoUpload> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { ok: false, error: "Invalid photo data", status: 400 };
  }
  const showId = stringField(form.get("show_id"));
  const entryId = stringField(form.get("entry_id"));
  const photo = form.get("photo");
  if (!showId || !entryId || !(photo instanceof Blob) || photo.size === 0) {
    return {
      ok: false,
      error: "show_id, entry_id, and photo required",
      status: 400,
    };
  }
  const bytes = Buffer.from(await photo.arrayBuffer());
  const mime =
    stringField(form.get("mime")) ||
    (photo.type ? photo.type : undefined);
  return { ok: true, show_id: showId, entry_id: entryId, bytes, mime };
}

async function parseJsonPhoto(request: Request): Promise<ParsedDogPhotoUpload> {
  const body = await readJsonBody<{
    show_id: string;
    entry_id: string;
    photo_base64: string;
    mime?: string;
  }>(request);
  if (!body?.show_id || !body.entry_id || !body.photo_base64) {
    return {
      ok: false,
      error: "show_id, entry_id, and photo_base64 required",
      status: 400,
    };
  }
  if (body.photo_base64.length > DOG_PHOTO_MAX_BASE64_CHARS) {
    return {
      ok: false,
      error: "Photo must be 5 MB or smaller",
      status: 400,
    };
  }
  try {
    return {
      ok: true,
      show_id: body.show_id,
      entry_id: body.entry_id,
      bytes: Buffer.from(body.photo_base64, "base64"),
      mime: body.mime,
    };
  } catch {
    return { ok: false, error: "Invalid photo data", status: 400 };
  }
}

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
