import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import { resolveSeFormForPdf } from "./se-pdf-form";

describe("resolveSeFormForPdf", () => {
  const empty = createEmptyTnrkSeForm();
  const filled = {
    ...createEmptyTnrkSeForm(),
    dog_name: "Ason Von Haus Wilkerson",
    judge: "Sandra Reck (ADRK)",
    sex: "male" as const,
    bite: "correct_scissor" as const,
    head_shape: "strong_typey" as const,
    final_result: "pass" as const,
    formwert: "V" as const,
    measurements: { ...empty.measurements, height: "67cm", weight: "53kg" },
    overall_appearance: "Very large male, strong bones.",
  };
  const entries = [
    {
      id: "entry-016",
      show_id: "s1",
      dog_id: "dog-1",
      event_kind: "conformation" as const,
      dog_name: "Ason Von Haus Wilkerson",
      armband: "38",
      owner: "Mr. Michael Wilkerson",
      email: "",
      sex: "R" as const,
      zb_number: "AKC-WS73993802",
      wt: "2021-08-31",
    },
    {
      id: "entry-038-se",
      show_id: "s1",
      dog_id: "dog-1",
      event_kind: "se" as const,
      dog_name: "Ason Von Haus Wilkerson",
      armband: "38",
      owner: "Mr. Michael Wilkerson",
      email: "",
      sex: "R" as const,
      zb_number: "AKC-WS73993802",
      wt: "2021-08-31",
    },
  ];
  const evaluations = [
    { entry_id: "entry-016", form: empty, status: "draft" },
    { entry_id: "entry-038-se", form: filled, status: "draft" },
  ];

  it("prints the filled sibling when the requested evaluation is empty", () => {
    const form = resolveSeFormForPdf({
      evaluation: evaluations[0],
      evaluations,
      entries,
    });
    expect(form.measurements.height).toBe("67cm");
    expect(form.measurements.weight).toBe("53kg");
    expect(form.overall_appearance).toBe("Very large male, strong bones.");
    expect(form.dog_name).toBe("Ason Von Haus Wilkerson");
    expect(form.owner_co_owner).toBe("Mr. Michael Wilkerson");
    expect(form.registration_number).toBe("AKC-WS73993802");
    expect(form.sex).toBe("male");
    expect(form.judge).toBe("Sandra Reck (ADRK)");
    expect(form.bite).toBe("correct_scissor");
    expect(form.head_shape).toBe("strong_typey");
    expect(form.final_result).toBe("pass");
    expect(form.formwert).toBe("V");
  });

  it("keeps on-screen incoming values over a stored sibling", () => {
    const form = resolveSeFormForPdf({
      evaluation: evaluations[1],
      incoming: {
        ...filled,
        measurements: { ...filled.measurements, height: "68cm live" },
        overall_appearance: "Live critique.",
      },
      evaluations,
      entries,
    });
    expect(form.measurements.height).toBe("68cm live");
    expect(form.overall_appearance).toBe("Live critique.");
  });
});
