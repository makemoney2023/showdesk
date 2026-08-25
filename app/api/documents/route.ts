import { NextResponse } from "next/server";
import {
  newId,
  readStore,
  updateStore,
  writeDogDocument,
} from "@/lib/store";
import {
  requireApiSession,
  requireApiWrite,
  isApiUnauthorized,
} from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/read-json";
import { dogKey } from "@/lib/domain/dog-identity";
import {
  DOG_DOCUMENT_MAX_BASE64_CHARS,
  sanitizeDocumentFilename,
  validateDogDocumentUpload,
} from "@/lib/domain/dog-document";

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const showId = searchParams.get("show_id");
  const dogId = searchParams.get("dog_id");
  if (!showId || !dogId) {
    return NextResponse.json({ error: "show_id and dog_id required" }, { status: 400 });
  }
  const store = await readStore();
  return NextResponse.json({
    documents: (store.dog_documents ?? []).filter(
      (document) => document.show_id === showId && document.dog_id === dogId,
    ),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const body = await readJsonBody<{
    show_id: string;
    entry_id: string;
    file_base64: string;
    filename?: string;
    mime?: string;
  }>(request);
  if (!body?.show_id || !body.entry_id || !body.file_base64) {
    return NextResponse.json(
      { error: "show_id, entry_id, and file_base64 required" },
      { status: 400 },
    );
  }
  if (body.file_base64.length > DOG_DOCUMENT_MAX_BASE64_CHARS) {
    return NextResponse.json(
      { error: "Document must be 10 MB or smaller" },
      { status: 400 },
    );
  }

  const store = await readStore();
  const entry = store.entries.find(
    (item) => item.id === body.entry_id && item.show_id === body.show_id,
  );
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  const dogId = entry.dog_id || dogKey(entry);

  let bytes: Buffer;
  try {
    bytes = Buffer.from(body.file_base64, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid document data" }, { status: 400 });
  }

  const validation = validateDogDocumentUpload({
    bytes,
    claimedMime: body.mime,
    filename: body.filename,
  });
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const documentId = newId("doc");
  const path = await writeDogDocument({
    showId: body.show_id,
    dogId,
    documentId,
    ext: validation.ext,
    bytes,
    contentType: validation.mime,
  });
  const document = {
    id: documentId,
    show_id: body.show_id,
    dog_id: dogId,
    path,
    filename: sanitizeDocumentFilename(body.filename ?? "document", validation.ext),
    content_type: validation.mime,
    created_at: new Date().toISOString(),
  };

  await updateStore((s) => ({
    ...s,
    entries: s.entries.map((item) =>
      item.id === entry.id ? { ...item, dog_id: item.dog_id ?? dogId } : item,
    ),
    dog_documents: [...(s.dog_documents ?? []), document],
  }));

  return NextResponse.json({ document }, { status: 201 });
}
