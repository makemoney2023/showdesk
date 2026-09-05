import { describe, expect, it } from "vitest";
import {
  ADRK_CLASSES,
  ADRK_FORMWERT_CODES,
  createEmptyDraft,
  critiqueCertificateNameLine,
  critiqueCertificateRating,
  formatAdrkFormwert,
  formwertScaleForEntry,
  formwertSelectCodes,
  getAdrkClassLabel,
  getAdrkFormwertLabel,
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

  it("uses promising labels for puppy classes", () => {
    expect(formwertScaleForEntry({ catalog_class: "puppy-i" })).toBe("puppy");
    expect(formwertScaleForEntry({ catalog_class: "puppy-iii" })).toBe("puppy");
    expect(formwertScaleForEntry({ class_id: "babyklasse" })).toBe("puppy");
    expect(formwertScaleForEntry({ catalog_class: "youth-i" })).toBe("adult");
    expect(formwertScaleForEntry({ catalog_class: "open" })).toBe("adult");
    expect(getAdrkFormwertLabel("vv", "puppy")).toBe("Very promising");
    expect(getAdrkFormwertLabel("V", "puppy")).toBe("Promising");
    expect(getAdrkFormwertLabel("V", "adult")).toBe("Excellent");
    expect(formatAdrkFormwert("vv", "puppy")).toBe("vv (Very promising)");
    expect(formwertSelectCodes("puppy")).toEqual([
      "vv",
      "V",
      "wv",
      "oB",
      "zgz",
      "ne",
      "disq.",
    ]);
    expect(formwertSelectCodes("adult")[0]).toBe("V");
    expect(formwertSelectCodes("puppy", "Sg")[0]).toBe("Sg");
  });

  it("formats a compact class-aware rating for certificates", () => {
    expect(critiqueCertificateRating("vv", "puppy")).toBe("vv Very promising");
    expect(critiqueCertificateRating("V", "adult")).toBe("V Excellent");
    expect(critiqueCertificateRating(null, "puppy")).toBe("");
    expect(
      critiqueCertificateNameLine("Der Norden's Aka Azure", "vv", "puppy"),
    ).toBe("Der Norden's Aka Azure  ·  vv Very promising");
    expect(critiqueCertificateNameLine("Rex vom Test", null)).toBe(
      "Rex vom Test",
    );
  });
});
