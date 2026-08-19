import { describe, expect, it } from "vitest";
import {
  ADRK_CLASSES,
  ADRK_FORMWERT_CODES,
  createEmptyDraft,
  formatAdrkFormwert,
  getAdrkClassLabel,
  isValidAdrkClassId,
  isValidFormwert,
} from "./adrk-template";

describe("adrk-template", () => {
  it("includes all nine standard ADRK classes with English labels", () => {
    const labels = ADRK_CLASSES.map((c) => c.label);
    expect(labels).toContain("Baby Class");
    expect(labels).toContain("Puppy Class");
    expect(labels).toContain("Youth Class I");
    expect(labels).toContain("Youth Class II");
    expect(labels).toContain("Intermediate Class");
    expect(labels).toContain("Open Class");
    expect(labels).toContain("Working Dog Class");
    expect(labels).toContain("Champion Class");
    expect(labels).toContain("Veteran Class");
    expect(ADRK_CLASSES).toHaveLength(9);
  });

  it("validates formwert codes from official form", () => {
    expect(isValidFormwert("V")).toBe(true);
    expect(isValidFormwert("disq.")).toBe(true);
    expect(isValidFormwert("VP")).toBe(false);
    expect(ADRK_FORMWERT_CODES).toContain("Sg");
  });

  it("validates class ids", () => {
    expect(isValidAdrkClassId("zwischenklasse")).toBe(true);
    expect(isValidAdrkClassId("invalid")).toBe(false);
  });

  it("creates empty draft with narrative-first schema", () => {
    const draft = createEmptyDraft();
    expect(draft.narrative).toBe("");
    expect(draft.formwert).toBeNull();
    expect(draft.placement).toBeNull();
    expect(draft.titles).toEqual([]);
  });

  it("resolves English class labels", () => {
    expect(getAdrkClassLabel("babyklasse")).toBe("Baby Class");
    expect(getAdrkClassLabel("zwischenklasse")).toBe("Intermediate Class");
  });

  it("formats Formwert with English gloss", () => {
    expect(formatAdrkFormwert("V")).toBe("V (Excellent)");
    expect(formatAdrkFormwert(null)).toBe("—");
  });
});
