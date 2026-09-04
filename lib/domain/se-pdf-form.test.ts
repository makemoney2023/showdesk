import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import { resolveSeFormForPdf } from "./se-pdf-form";

describe("resolveSeFormForPdf", () => {
  const empty = createEmptyTnrkSeForm();
  const filled = {
    ...createEmptyTnrkSeForm(),
    dog_name: "Ason Von Haus Wilkerson",
    measurements: { ...empty.measurements, height: "67cm", weight: "53kg" },
    overall_appearance: "Very large male, strong bones.",
  };
  const entries = [
    {
      id: "entry-016",
      show_id: "s1",
      dog_id: "dog-1",
      event_kind: "conformation" as const,
    },
    {
      id: "entry-038-se",
      show_id: "s1",
      dog_id: "dog-1",
      event_kind: "se" as const,
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
