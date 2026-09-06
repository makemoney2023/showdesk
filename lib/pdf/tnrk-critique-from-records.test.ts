import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import { extractPdfText } from "./pdf-text";
import {
  buildTnrkCritiquePdfForRecords,
  critiqueCertificatePlacement,
  critiqueClassAndRatingLine,
  seNarrativeFromForm,
} from "./tnrk-critique-from-records";

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

describe("critique certificate class line", () => {
  const puppy7 = {
    class_id: "babyklasse" as const,
    sex: "H" as const,
    event_kind: "conformation" as const,
    catalog_class: "puppy-i" as const,
  };

  it("prints VP and the saved place for a puppy", () => {
    expect(critiqueClassAndRatingLine(puppy7, "vv", 4)).toBe(
      "Puppy Class I — Female (Hündin) — VP 4",
    );
  });

  it("prints adult V without inventing a place", () => {
    expect(
      critiqueClassAndRatingLine(
        {
          class_id: "offene-klasse",
          sex: "R",
          event_kind: "conformation",
          catalog_class: "open",
        },
        "V",
        null,
      ),
    ).toBe("Open — Male (Rüde) — V");
  });

  it("prefers the placements table over a draft place", () => {
    expect(
      critiqueCertificatePlacement(
        "entry-7",
        { draft: { narrative: "", formwert: "vv", placement: 2, titles: [] } },
        [{ entry_id: "entry-7", placement: 4 }],
      ),
    ).toBe(4);
  });

  it("falls back to the draft place when nothing is saved", () => {
    expect(
      critiqueCertificatePlacement("entry-7", {
        draft: { narrative: "", formwert: "vv", placement: 3, titles: [] },
      }),
    ).toBe(3);
  });

  it("writes VP 4 on the puppy #7 certificate, not the stored vv code", async () => {
    const bytes = await buildTnrkCritiquePdfForRecords({
      show: {
        id: "show-1",
        name: "TNRK Sieger Show 2026",
        date: "2026-09-05",
        venue: "Demo",
        judge: "Hamid Falah",
        rulebook: "adrk",
        created_at: "t",
      },
      entry: {
        id: "entry-7",
        show_id: "show-1",
        armband: "7",
        dog_name: "Epic Rr Femme Fatale Diva",
        zb_number: "",
        wt: "2026-03-01",
        owner: "Owner",
        sex: "H",
        class_id: "babyklasse",
        event_kind: "conformation",
        catalog_class: "puppy-i",
        email: "",
      },
      critique: {
        id: "crit-7",
        show_id: "show-1",
        entry_id: "entry-7",
        status: "APPROVED",
        transcript: "Very promising female.",
        draft: {
          narrative: "Very promising female.",
          formwert: "vv",
          placement: null,
          titles: [],
        },
        delivery_status: "pending",
        created_at: "t",
        updated_at: "t",
      },
      placements: [{ entry_id: "entry-7", placement: 4 }],
    });
    expect(extractPdfText(bytes)).toMatch(/VP 4/);
  });
});
