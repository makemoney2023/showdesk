import { describe, expect, it } from "vitest";
import { awardYFromTop, buildTnrkAwardPdf } from "./tnrk-award-pdf";

describe("tnrk-award-pdf", () => {
  it("applies MediaBox y offset like other TNRK overlays", () => {
    expect(awardYFromTop(792, 100, 8.58)).toBeCloseTo(700.58);
    expect(awardYFromTop(792, 100, 0)).toBe(692);
  });

  it("builds a non-trivial award PDF", async () => {
    const bytes = await buildTnrkAwardPdf({
      date: "2026-08-13",
      lines: ["Best Male", "Rex Happy Path", "Owner: Max Mustermann"],
      judge: "Test Judge",
      show_secretary: "Show Secretary",
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
