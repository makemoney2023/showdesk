import { inflateSync } from "zlib";

function decodePdfLiteral(literal: string): string {
  return literal
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([()\\])/g, "$1");
}

function decodePdfHex(hex: string): string {
  const compact = hex.replace(/\s+/g, "");
  if (!compact || compact.length % 2 !== 0 || /[^0-9a-fA-F]/.test(compact)) {
    return "";
  }
  const chars: string[] = [];
  for (let i = 0; i < compact.length; i += 2) {
    const code = Number.parseInt(compact.slice(i, i + 2), 16);
    if (code >= 32 && code < 127) chars.push(String.fromCharCode(code));
    else if (code === 10 || code === 13) chars.push(" ");
  }
  return chars.join("");
}

function stringsFromPdfPayload(payload: string): string[] {
  const out: string[] = [];
  const literalRe = /\((?:\\.|[^\\)])*\)/g;
  let match: RegExpExecArray | null;
  while ((match = literalRe.exec(payload))) {
    out.push(decodePdfLiteral(match[0].slice(1, -1)));
  }
  const hexRe = /<([0-9A-Fa-f \t\r\n]+)>/g;
  while ((match = hexRe.exec(payload))) {
    const decoded = decodePdfHex(match[1]);
    if (decoded) out.push(decoded);
  }
  return out;
}

function inflatePdfStreams(bytes: Uint8Array): string[] {
  const latin = Buffer.from(bytes).toString("latin1");
  const chunks = [latin];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(latin))) {
    const payload = Buffer.from(match[1], "latin1");
    try {
      chunks.push(inflateSync(payload).toString("latin1"));
    } catch {
      chunks.push(payload.toString("latin1"));
    }
  }
  return chunks;
}

/** Best-effort extraction of drawn PDF text, including Flate streams. */
export function extractPdfText(bytes: Uint8Array): string {
  return inflatePdfStreams(bytes)
    .filter((chunk) => chunk.includes("Tj") || chunk.includes("TJ"))
    .flatMap((chunk) => stringsFromPdfPayload(chunk))
    .join(" ");
}

export function pdfContainsText(bytes: Uint8Array, needle: string): boolean {
  const haystack = extractPdfText(bytes).toLowerCase();
  const phrase = needle.trim().toLowerCase();
  if (!phrase) return false;
  if (haystack.includes(phrase)) return true;
  return phrase
    .split(/\s+/)
    .every((word) => word.length === 0 || haystack.includes(word));
}
