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
