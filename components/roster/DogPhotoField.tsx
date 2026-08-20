"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dogPhotoHref } from "@/lib/domain/dog-photo";

function fileToBase64(file: File): Promise<string> {
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

export function DogPhotoField({
  showId,
  entryId,
  photoPath,
  disabled,
  onChanged,
}: {
  showId: string;
  entryId?: string;
  photoPath?: string;
  disabled?: boolean;
  onChanged: (photoPath: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canUpload = Boolean(showId && entryId && !disabled);
  const src = showId && entryId && photoPath ? dogPhotoHref(showId, entryId) : "";

  async function upload(file: File) {
    if (!showId || !entryId) {
      setError("Save the dog profile first, then add a photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const photo_base64 = await fileToBase64(file);
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          entry_id: entryId,
          photo_base64,
          mime: file.type,
        }),
      });
      const data = (await res.json()) as { photo_path?: string; error?: string };
      if (!res.ok || !data.photo_path) {
        setError(data.error ?? "Could not upload photo");
        return;
      }
      onChanged(data.photo_path);
    } catch {
      setError("Could not upload photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!showId || !entryId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/photos?entry_id=${encodeURIComponent(entryId)}&show_id=${encodeURIComponent(showId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not remove photo");
        return;
      }
      onChanged(undefined);
    } catch {
      setError("Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="dog-photo">Dog photo</Label>
      <div className="flex flex-wrap items-start gap-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Dog"
            className="h-24 w-24 rounded-md border border-sss-border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-sss-border text-xs text-sss-text-muted">
            No photo
          </div>
        )}
        <div className="space-y-2">
          <input
            id="dog-photo"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="block text-sm"
            disabled={!canUpload || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          {photoPath ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !canUpload}
              onClick={() => void removePhoto()}
            >
              Remove photo
            </Button>
          ) : null}
          {!entryId ? (
            <p className="text-xs text-sss-text-muted">
              Create the profile first, then upload a photo.
            </p>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
