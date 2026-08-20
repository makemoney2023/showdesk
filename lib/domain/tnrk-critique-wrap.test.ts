import { describe, expect, it } from "vitest";
import {
  TNRK_CRITIQUE_MAX_NARRATIVE_LINES,
  critiqueNarrativeOverflowsCertificate,
  wrapCritiqueNarrative,
} from "./tnrk-critique-wrap";

describe("wrapCritiqueNarrative", () => {
  it("wraps at the certificate column width", () => {
    const words = Array.from({ length: 20 }, () => "word");
    const lines = wrapCritiqueNarrative(words.join(" "));
    expect(lines.every((line) => line.length <= 90)).toBe(true);
    expect(lines.length).toBeGreaterThan(1);
  });

  it("flags narratives that exceed the printed 12-line band", () => {
    const long = Array.from(
      { length: TNRK_CRITIQUE_MAX_NARRATIVE_LINES + 2 },
      (_, i) => `Line number ${i} with extra words to fill the certificate row.`,
    ).join(" ");
    expect(critiqueNarrativeOverflowsCertificate(long)).toBe(true);
    expect(critiqueNarrativeOverflowsCertificate("Short critique.")).toBe(false);
  });
});
