"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DOG_DOCUMENT_MAX_BYTES,
  dogDocumentHref,
  type DogDocumentRecord,
} from "@/lib/domain/dog-document";

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DogDocumentsField({
  showId,
  entryId,
  dogId,
  pendingFiles = [],
  onPendingFilesChange,
}: {
  showId: string;
  entryId?: string;
  dogId?: string;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DogDocumentRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!showId || !dogId) {
      setDocuments([]);
      return;
    }
    void fetch(`/api/documents?show_id=${showId}&dog_id=${dogId}`)
      .then((res) => res.json())
      .then((data: { documents?: DogDocumentRecord[] }) => {
        setDocuments(data.documents ?? []);
      })
      .catch(() => undefined);
  }, [showId, dogId]);

  async function upload(file: File) {
    if (!showId || !entryId) {
      if (file.size > DOG_DOCUMENT_MAX_BYTES) {
        setError("Document must be 10 MB or smaller (PDF, JPEG, PNG, or WebP).");
        return;
      }
      onPendingFilesChange?.([...pendingFiles, file]);
      setError("");
      return;
    }
    if (file.size > DOG_DOCUMENT_MAX_BYTES) {
      setError("Document must be 10 MB or smaller (PDF, JPEG, PNG, or WebP).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const file_base64 = await fileToBase64(file);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          entry_id: entryId,
          file_base64,
          filename: file.name,
          mime: file.type,
        }),
      });
      const data = (await res.json()) as {
        document?: DogDocumentRecord;
        error?: string;
      };
      if (!res.ok || !data.document) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setDocuments((current) => [...current, data.document!]);
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(documentId: string) {
    if (!showId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/documents/${documentId}?show_id=${showId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setDocuments((current) =>
          current.filter((document) => document.id !== documentId),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>
        Clearances and attachments (optional)
      </Label>
      <p className="text-xs text-sss-text-muted">
        HD/ED, eye, heart, OFA/ADRK, JLPP, NAD. Attach a PDF when you have
        one — SE create and completion do not require it. Shown on public
        results if you publish the show.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {entryId ? "Upload document" : "Attach document"}
      </Button>
      {pendingFiles.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2"
            >
              <span>{file.name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onPendingFilesChange?.(
                    pendingFiles.filter((_, item) => item !== index),
                  )
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {documents.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-2">
              <a
                href={dogDocumentHref(showId, document.id)}
                target="_blank"
                rel="noreferrer"
                className="text-sss-accent-deep hover:underline"
              >
                {document.filename}
              </a>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void remove(document.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
