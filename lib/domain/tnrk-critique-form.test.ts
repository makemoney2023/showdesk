import { describe, expect, it } from "vitest";
import {
  createEmptyTnrkCritiqueForm,
} from "./tnrk-se-form";

describe("tnrk-critique-form", () => {
  it("creates empty critique header fields matching TNRK page 1", () => {
    const form = createEmptyTnrkCritiqueForm();
    expect(form.dog_name).toBe("");
    expect(form.armband).toBe("");
    expect(form.class_and_rating).toBe("");
    expect(form.narrative).toBe("");
    expect(form.judge_signature).toBe("");
  });
});
