import { NextResponse } from "next/server";
import {
  deleteDogDocument,
  readDogDocument,
  readStore,
  updateStore,
} from "@/lib/store";
import {
  requireApiSession,
  requireApiWrite,
  isApiUnauthorized,
} from "@/lib/auth/api-guard";
import { isOwnedDogDocumentPath } from "@/lib/domain/dog-document";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const auth = await requireApiSession();
  if (isApiUnauthorized(auth)) return auth;

  const { documentId } = await context.params;
  const showId = new URL(request.url).searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }
  const store = await readStore();
  const document = (store.dog_documents ?? []).find(
    (item) => item.id === documentId && item.show_id === showId,
  );
  if (
    !document ||
    !isOwnedDogDocumentPath(document.path, showId, document.dog_id, document.id)
  ) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const bytes = await readDogDocument(document.path);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.content_type,
      "Content-Disposition": `inline; filename="${document.filename}"`,
    },
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const auth = await requireApiWrite();
  if (isApiUnauthorized(auth)) return auth;

  const { documentId } = await context.params;
  const showId = new URL(request.url).searchParams.get("show_id");
  if (!showId) {
    return NextResponse.json({ error: "show_id required" }, { status: 400 });
  }
  const store = await readStore();
  const document = (store.dog_documents ?? []).find(
    (item) => item.id === documentId && item.show_id === showId,
  );
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  await updateStore((s) => ({
    ...s,
    dog_documents: (s.dog_documents ?? []).filter(
      (item) => item.id !== documentId,
    ),
  }));
  await deleteDogDocument(document.path).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
