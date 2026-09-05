import { describe, expect, it } from "vitest";
import {
  isUsableRecordingBlob,
  microphoneErrorLabel,
  pickRecordingMimeType,
  vuBarHeightPx,
  vuLevelFromTimeDomain,
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

describe("vuLevelFromTimeDomain", () => {
  it("is silent at the 8-bit midpoint", () => {
    expect(vuLevelFromTimeDomain(Uint8Array.from({ length: 32 }, () => 128))).toBe(
      0,
    );
  });

  it("rises when the waveform has amplitude", () => {
    const loud = Uint8Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 255 : 1));
    expect(vuLevelFromTimeDomain(loud)).toBeGreaterThan(50);
  });
});

describe("vuBarHeightPx", () => {
  it("grows across the meter so active bars are visible", () => {
    expect(vuBarHeightPx(0, 24)).toBe(8);
    expect(vuBarHeightPx(23, 24)).toBe(72);
    expect(vuBarHeightPx(11, 24)).toBeGreaterThan(vuBarHeightPx(0, 24));
  });
});

describe("isUsableRecordingBlob", () => {
  it("rejects empty or header-only takes", () => {
    expect(isUsableRecordingBlob({ size: 0 })).toBe(false);
    expect(isUsableRecordingBlob({ size: 80 })).toBe(false);
    expect(isUsableRecordingBlob({ size: 1024 })).toBe(true);
  });
});
