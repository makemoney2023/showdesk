"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dogPhotoHref } from "@/lib/domain/dog-photo";
import { prepareDogPhotoFile } from "@/lib/client/prepare-dog-photo";
import { cn } from "@/lib/utils";

export function DogPhotoField({
  showId,
  entryId,
  photoPath,
  disabled,
  preferCamera,
  onChanged,
}: {
  showId: string;
  entryId?: string;
  photoPath?: string;
  disabled?: boolean;
  preferCamera?: boolean;
  onChanged: (photoPath: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bust, setBust] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const canUpload = Boolean(showId && entryId && !disabled);
  const src =
    showId && entryId && photoPath
      ? dogPhotoHref(showId, entryId, { cacheBust: bust || photoPath })
      : "";

  async function upload(file: File) {
    if (!showId || !entryId) {
      setError("Save the dog profile first, then add a photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareDogPhotoFile(file);
      const body = new FormData();
      body.set("show_id", showId);
      body.set("entry_id", entryId);
      body.set("photo", prepared, prepared.name);
      body.set("mime", prepared.type);
      const res = await fetch("/api/photos", {
        method: "POST",
        body,
      });
      if (res.status === 413) {
        setError("Photo is too large for the desk — try a smaller JPEG.");
        return;
      }
      const data = (await res.json()) as { photo_path?: string; error?: string };
      if (!res.ok || !data.photo_path) {
        setError(data.error ?? "Could not upload photo");
        return;
      }
      setBust(Date.now());
      onChanged(data.photo_path);
    } catch (error) {
      setError(
        error instanceof Error && error.message
          ? error.message
          : "Could not upload photo",
      );
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
      setBust(0);
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
      <input
        id="dog-photo"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        {...(preferCamera ? { capture: "environment" as const } : {})}
        className="sr-only"
        disabled={!canUpload || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={!canUpload || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (canUpload) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-sss-md border border-dashed px-3 py-3 text-left transition-colors",
          dragOver
            ? "border-sss-accent bg-sss-lifted"
            : "border-sss-border bg-sss-paper hover:border-sss-accent-soft",
          (!canUpload || busy) && "cursor-not-allowed opacity-70",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Dog"
            className="h-20 w-20 rounded-md border border-sss-border object-cover"
          />
        ) : (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-md bg-sss-lifted text-sss-text-muted">
            <Camera className="h-7 w-7" aria-hidden />
          </span>
        )}
        <span className="space-y-1">
          <span className="block text-sm font-medium">
            {busy
              ? "Uploading…"
              : src
                ? "Replace photo"
                : preferCamera
                  ? "Tap to photograph"
                  : "Drop a photo or click to upload"}
          </span>
          <span className="block text-xs text-sss-text-muted">
            JPEG, PNG, or WebP · phone photos are resized automatically
          </span>
        </span>
      </button>
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
