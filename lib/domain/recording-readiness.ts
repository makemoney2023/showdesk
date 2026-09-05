export const MIN_RECORDING_BYTES = 250;

const RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
] as const;

export function pickRecordingMimeType(
  isTypeSupported: (type: string) => boolean = (type) =>
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function" &&
    MediaRecorder.isTypeSupported(type),
): string | undefined {
  return RECORDING_MIME_CANDIDATES.find((type) => isTypeSupported(type));
}

export function isUsableRecordingBlob(blob: Pick<Blob, "size"> | null | undefined): boolean {
  return Boolean(blob && blob.size >= MIN_RECORDING_BYTES);
}

/** RMS of unsigned 8-bit PCM (128 = silence). Frequency bins stay quiet on speech. */
export function vuLevelFromTimeDomain(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = ((data[i] ?? 128) - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / data.length);
  return Math.min(100, Math.round(rms * 160));
}

export function vuBarHeightPx(
  index: number,
  barCount: number,
  minPx = 8,
  maxPx = 72,
): number {
  if (barCount <= 1) return maxPx;
  const t = Math.min(1, Math.max(0, index / (barCount - 1)));
  return Math.round(minPx + t * (maxPx - minPx));
}

export function microphoneErrorLabel(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone blocked — allow access in browser settings";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microphone is busy in another app";
  }
  return "Could not open the microphone";
}
