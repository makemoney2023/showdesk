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
