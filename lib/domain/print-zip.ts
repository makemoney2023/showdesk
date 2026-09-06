import { slugify } from "./public-results";
import type { ReportDocumentKind, ReportDocumentLink } from "./report-documents";

export type PrintZipKind = "tnrk_critique" | "tnrk_se" | "award";

export interface PrintZipItem {
  path: string;
  href: string;
}

export interface PrintZipRow {
  entryId: string;
  armband: string;
  dogName: string;
  documents: Pick<
    ReportDocumentLink,
    "kind" | "href" | "available" | "printable"
  >[];
}

const PRINT_ZIP_FOLDER: Record<PrintZipKind, string> = {
  tnrk_critique: "certificates",
  tnrk_se: "se-forms",
  award: "awards",
};

const PRINT_ZIP_SUFFIX: Record<PrintZipKind, string> = {
  tnrk_critique: "critique",
  tnrk_se: "se",
  award: "award",
};

const PRINT_ZIP_KINDS = new Set<ReportDocumentKind>([
  "tnrk_critique",
  "tnrk_se",
  "award",
]);

export function isPrintZipKind(kind: ReportDocumentKind): kind is PrintZipKind {
  return PRINT_ZIP_KINDS.has(kind);
}

export function printZipFilePath(input: {
  armband: string;
  dogName: string;
  kind: PrintZipKind;
}): string {
  const folder = PRINT_ZIP_FOLDER[input.kind];
  const stem = `${slugify(input.armband) || "0"}-${slugify(input.dogName) || "entry"}`;
  return `${folder}/${stem}-${PRINT_ZIP_SUFFIX[input.kind]}.pdf`;
}

export function printZipArchiveName(showName?: string): string {
  const slug = slugify(showName ?? "") || "show";
  return `${slug}-print-pdfs.zip`;
}

/**
 * Official print-shop files: approved critiques, complete SE forms, and
 * award sheets. Uses the current selection when any dogs are checked;
 * otherwise every printable dog in the list.
 */
export function collectPrintZipItems(
  rows: PrintZipRow[],
  selectedIds: string[],
): PrintZipItem[] {
  const selected = new Set(selectedIds);
  const scope =
    selected.size > 0
      ? rows.filter((row) => selected.has(row.entryId))
      : rows;
  const items: PrintZipItem[] = [];
  for (const row of scope) {
    for (const doc of row.documents) {
      if (!isPrintZipKind(doc.kind) || !doc.href) continue;
      const include =
        doc.kind === "award" ? Boolean(doc.available) : Boolean(doc.printable);
      if (!include) continue;
      items.push({
        path: printZipFilePath({
          armband: row.armband,
          dogName: row.dogName,
          kind: doc.kind,
        }),
        href: doc.href,
      });
    }
  }
  return items;
}

export function printZipDisabledReason(itemCount: number): string | null {
  if (itemCount > 0) return null;
  return "No approved certificates, complete SE forms, or award sheets in this list.";
}

export const PRINT_ZIP_FETCH_CONCURRENCY = 3;

export async function buildPrintZipBytes(input: {
  items: PrintZipItem[];
  fetchPdf: (href: string) => Promise<Uint8Array>;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ bytes: Uint8Array; failed: string[] }> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const failed: string[] = [];
  let done = 0;
  const queue = [...input.items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      try {
        const bytes = await input.fetchPdf(item.href);
        zip.file(item.path, bytes);
      } catch {
        failed.push(item.path);
      }
      done += 1;
      input.onProgress?.(done, input.items.length);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PRINT_ZIP_FETCH_CONCURRENCY, input.items.length) },
      () => worker(),
    ),
  );

  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
  return { bytes, failed };
}

export function saveBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
