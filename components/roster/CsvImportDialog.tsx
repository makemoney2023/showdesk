"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rosterCsvTemplate } from "@/lib/domain/roster";
import { isCsvFile, readCsvFileText } from "@/lib/domain/csv-file";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (csv: string) => Promise<void>;
  disabled?: boolean;
};

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFileName(null);
    setPreview("");
    setError("");
    setDragging(false);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function loadFile(file: File | null | undefined) {
    if (!file) return;
    setError("");
    try {
      if (!isCsvFile(file)) {
        setError("Please drop a .csv file");
        return;
      }
      const text = await readCsvFileText(file);
      setFileName(file.name);
      setPreview(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file");
      setFileName(null);
      setPreview("");
    }
  }

  async function handleImport() {
    if (!preview.trim()) {
      setError("Choose a CSV file or load the template first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onImport(preview);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import roster CSV</DialogTitle>
          <DialogDescription>
            Drag and drop a .csv file, or browse. Headers required: armband,
            dog_name, zb_number, wt, owner, sex, class_id, email.
            Sex accepts R/H, male/female, or Rüde/Hündin; unknown values are
            rejected rather than assumed male. Hosted imports also require
            event_kind, competition_day, and catalog_class.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => void loadFile(e.target.files?.[0])}
        />

        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void loadFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition-colors ${
            dragging
              ? "border-sss-accent bg-sss-lifted"
              : "border-sss-border bg-sss-ground hover:bg-sss-lifted"
          }`}
        >
          <span className="text-sm font-medium text-sss-text-primary">
            {fileName ? fileName : "Drop CSV here or click to browse"}
          </span>
          <span className="text-xs text-sss-text-muted">
            .csv files only · UTF-8 recommended
          </span>
        </button>

        {preview ? (
          <pre className="max-h-32 overflow-auto border border-sss-border bg-sss-ground p-2 font-mono text-xs whitespace-pre-wrap">
            {preview.slice(0, 1200)}
            {preview.length > 1200 ? "\n…" : ""}
          </pre>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              const template = rosterCsvTemplate();
              setFileName("template.csv");
              setPreview(template);
              setError("");
            }}
          >
            Load sample template
          </Button>
          <Button
            type="button"
            disabled={busy || disabled || !preview.trim()}
            onClick={() => void handleImport()}
          >
            {busy ? "Importing…" : "Import file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
