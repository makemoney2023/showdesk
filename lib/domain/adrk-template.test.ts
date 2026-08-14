import { describe, expect, it } from "vitest";
import {
  ADRK_CLASSES,
  ADRK_FORMWERT_CODES,
  createEmptyDraft,
  getAdrkClassLabel,
  isValidAdrkClassId,
  isValidFormwert,
} from "./adrk-template";

describe("adrk-template", () => {
  it("includes all nine standard ADRK classes", () => {
    const labels = ADRK_CLASSES.map((c) => c.label);
    expect(labels).toContain("Babyklasse");
    expect(labels).toContain("Jüngstenklasse");
    expect(labels).toContain("Jugendklasse I");
    expect(labels).toContain("Jugendklasse II");
    expect(labels).toContain("Zwischenklasse");
    expect(labels).toContain("Offene Klasse");
    expect(labels).toContain("Gebrauchshundklasse");
    expect(labels).toContain("Championklasse");
    expect(labels).toContain("Veteranenklasse");
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

  it("resolves class labels", () => {
    expect(getAdrkClassLabel("babyklasse")).toBe("Babyklasse");
  });
});
