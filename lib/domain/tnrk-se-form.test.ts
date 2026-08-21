import { describe, expect, it } from "vitest";
import {
  createEmptyTnrkSeForm,
  HEAD_SHAPE_OPTIONS,
  CHEEK_BONE_OPTIONS,
  BONE_STRENGTH_OPTIONS,
  BEHAVIOR_OPTIONS,
  GUNFIRE_OPTIONS,
  validateTnrkSeFormForPass,
  mergeEntryIntoSeForm,
  formatSeMissingFields,
  seCompletionGaps,
} from "./tnrk-se-form";

describe("tnrk-se-form", () => {
  it("creates an empty SE form with TNRK club default", () => {
    const form = createEmptyTnrkSeForm();
    expect(form.club).toBe("True North Rottweiler Klub");
    expect(form.sex).toBeNull();
    expect(form.bite).toBeNull();
    expect(form.final_result).toBeNull();
    expect(form.head_shape).toBeNull();
    expect(form.measurements.height).toBe("");
  });

  it("exposes checkbox option sets from the TNRK SE template", () => {
    expect(HEAD_SHAPE_OPTIONS).toContain("sufficient_strong");
    expect(CHEEK_BONE_OPTIONS).toContain("distinct");
    expect(BONE_STRENGTH_OPTIONS).toContain("strong");
    expect(BEHAVIOR_OPTIONS).toContain("self_confident");
    expect(GUNFIRE_OPTIONS).toEqual(["no_reaction", "sensitive", "shy"]);
  });

  it("merges roster entry identity into SE header fields", () => {
    const form = mergeEntryIntoSeForm(createEmptyTnrkSeForm(), {
      dog_name: "Max vom Test",
      armband: "42",
      owner: "Jane Doe",
      email: "jane@example.com",
      sex: "R",
      zb_number: "CKC-123",
      wt: "2020-01-15",
    });
    expect(form.dog_name).toBe("Max vom Test");
    expect(form.registration_number).toBe("CKC-123");
    expect(form.date_of_birth).toBe("2020-01-15");
    expect(form.sex).toBe("male");
    expect(form.owner_co_owner).toBe("Jane Doe");
    expect(form.email).toBe("jane@example.com");
  });

  it("merges catalog pedigree and address into SE header fields", () => {
    const form = mergeEntryIntoSeForm(createEmptyTnrkSeForm(), {
      dog_name: "Beyonce Aus Dem Blumental",
      armband: "3",
      owner: "Marie Josee Gallant",
      email: "Vonstoisch@Gmail.com",
      sex: "H",
      zb_number: "CKC-FD-LU4301060",
      wt: "2023-10-25",
      sire: "Henry Von Der Burg Skiva",
      dam: "Akira Vom Luchweg",
      breeder: "Sabine Fielder",
      address: "1260 3E Rang Saint-Luc-De-Vincenne, Quebec G0X 3K0",
      hd_ed_jlpp: "Cardiac: Normal; JLPP: Normal",
    });
    expect(form.sire).toBe("Henry Von Der Burg Skiva");
    expect(form.dam).toBe("Akira Vom Luchweg");
    expect(form.breeder).toBe("Sabine Fielder");
    expect(form.address).toBe(
      "1260 3E Rang Saint-Luc-De-Vincenne, Quebec G0X 3K0",
    );
    expect(form.hd_ed_jlpp_nr).toBe("Cardiac: Normal; JLPP: Normal");
  });

  it("requires dog name + final result before treating SE as complete", () => {
    const empty = createEmptyTnrkSeForm();
    expect(validateTnrkSeFormForPass(empty).ok).toBe(false);

    const partial = { ...empty, dog_name: "Max" };
    expect(validateTnrkSeFormForPass(partial).ok).toBe(false);

    const complete = {
      ...empty,
      dog_name: "Max",
      final_result: "pass" as const,
      judge: "Judge One",
    };
    expect(validateTnrkSeFormForPass(complete).ok).toBe(true);
  });

  it("formats missing SE fields for steward feedback", () => {
    expect(formatSeMissingFields(["final_result", "judge"])).toBe(
      "Final result (Pass/Fail), Judge",
    );
  });

  it("lists live SE completion gaps with jump sections", () => {
    const empty = seCompletionGaps(createEmptyTnrkSeForm());
    expect(empty.map((gap) => gap.field)).toEqual([
      "dog_name",
      "final_result",
      "judge",
    ]);
    expect(empty.find((gap) => gap.field === "final_result")?.sectionId).toBe(
      "result",
    );
    expect(
      seCompletionGaps({
        ...createEmptyTnrkSeForm(),
        dog_name: "Max",
        final_result: "pass",
        judge: "Judge One",
      }),
    ).toEqual([]);
  });
});
