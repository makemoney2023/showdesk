import { describe, expect, it } from "vitest";
import {
  isUsableRecordingBlob,
  microphoneErrorLabel,
  pickRecordingMimeType,
} from "./recording-readiness";

describe("microphoneErrorLabel", () => {
  it("explains permission, missing-device, and busy-device errors", () => {
    expect(microphoneErrorLabel({ name: "NotAllowedError" })).toContain(
      "allow access",
    );
    expect(microphoneErrorLabel({ name: "NotFoundError" })).toBe(
      "No microphone found",
    );
    expect(microphoneErrorLabel({ name: "NotReadableError" })).toContain(
      "another app",
    );
  });

  it("uses a safe generic message for unknown failures", () => {
    expect(microphoneErrorLabel(new Error("hardware detail"))).toBe(
      "Could not open the microphone",
    );
  });
});

describe("pickRecordingMimeType", () => {
  it("picks the first type the browser actually supports", () => {
    expect(
      pickRecordingMimeType((type) => type === "audio/mp4"),
    ).toBe("audio/mp4");
  });

  it("returns undefined when nothing is supported so MediaRecorder can use its default", () => {
    expect(pickRecordingMimeType(() => false)).toBeUndefined();
  });
});

describe("isUsableRecordingBlob", () => {
  it("rejects empty or header-only takes", () => {
    expect(isUsableRecordingBlob({ size: 0 })).toBe(false);
    expect(isUsableRecordingBlob({ size: 80 })).toBe(false);
    expect(isUsableRecordingBlob({ size: 1024 })).toBe(true);
  });
});
