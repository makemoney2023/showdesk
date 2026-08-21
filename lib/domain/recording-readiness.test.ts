import { describe, expect, it } from "vitest";
import { microphoneErrorLabel } from "./recording-readiness";

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
