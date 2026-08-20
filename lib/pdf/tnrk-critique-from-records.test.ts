import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import { seNarrativeFromForm } from "./tnrk-critique-from-records";

describe("seNarrativeFromForm", () => {
  it("joins appearance, comments, and result", () => {
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Strong male";
    form.comments = "Moves freely";
    form.final_result = "pass";
    expect(
      seNarrativeFromForm({
        id: "se-1",
        show_id: "s",
        entry_id: "e",
        form,
        status: "complete",
        created_at: "t",
        updated_at: "t",
      }),
    ).toBe("Strong male\n\nMoves freely\n\nSE result: PASS");
  });

  it("returns empty when there is no SE", () => {
    expect(seNarrativeFromForm(null)).toBe("");
  });
});
