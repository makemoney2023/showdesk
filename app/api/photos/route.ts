import { NextResponse } from "next/server";
import { readStore, updateStore, writeDogPhoto, deleteDogPhoto } from "@/lib/store";
import { requireApiWrite, isApiUnauthorized } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";
import {
  DOG_PHOTO_MAX_BASE64_CHARS,
  validateDogPhotoUpload,
} from "@/lib/domain/dog-photo";

export async function POST(request: Request) {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    entry_id: string;
    photo_base64: string;
    mime?: string;
  }>(request);
  if (!body?.show_id || !body.entry_id || !body.photo_base64) {
    return NextResponse.json(
      { error: "show_id, entry_id, and photo_base64 required" },
      { status: 400 },
    );
  }
  if (body.photo_base64.length > DOG_PHOTO_MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "Photo must be 5 MB or smaller" }, { status: 400 });
  }

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === body.entry_id && e.show_id === body.show_id,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(body.photo_base64, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid photo data" }, { status: 400 });
  }

  const validation = validateDogPhotoUpload({
    bytes,
    claimedMime: body.mime,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const previous = entry.photo_path;
  const photoPath = await writeDogPhoto({
    showId: body.show_id,
    entryId: body.entry_id,
    ext: validation.ext,
    bytes,
    contentType: validation.mime,
  });

  await updateStore((s) => ({
    ...s,
    entries: s.entries.map((e) =>
      e.id === body.entry_id && e.show_id === body.show_id
        ? { ...e, photo_path: photoPath }
        : e,
    ),
  }));

  if (previous && previous !== photoPath) {
    await deleteDogPhoto(previous).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, photo_path: photoPath });
}

export async function DELETE(request: Request) {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get("entry_id");
  const showId = searchParams.get("show_id");
  if (!entryId || !showId) {
    return NextResponse.json(
      { error: "entry_id and show_id required" },
      { status: 400 },
    );
  }

  const store = await readStore();
  const entry = store.entries.find(
    (e) => e.id === entryId && e.show_id === showId,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  if (!entry.photo_path) {
    return NextResponse.json({ ok: true });
  }

  // Clear the reference first so a failed store write never leaves an entry
  // pointing at an already-deleted object.
  const photoPath = entry.photo_path;
  await updateStore((s) => ({
    ...s,
    entries: s.entries.map((e) =>
      e.id === entryId && e.show_id === showId
        ? { ...e, photo_path: undefined }
        : e,
    ),
  }));
  await deleteDogPhoto(photoPath).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
