import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import { extractPdfText } from "./pdf-text";
import {
  buildTnrkCritiquePdfForRecords,
  critiqueCertificateDate,
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

  it("uses the competition day, not the Friday SE date", () => {
    expect(
      critiqueCertificateDate({
        entry: {
          event_kind: "conformation",
          competition_day: "2026-09-05",
        },
        show: { date: "2026-09-04" },
        seDate: "2026-09-04",
      }),
    ).toBe("2026-09-05");
    expect(
      critiqueCertificateDate({
        entry: {
          event_kind: "conformation",
          competition_day: "2026-09-06",
        },
        show: { date: "2026-09-04" },
        seDate: "2026-09-04",
      }),
    ).toBe("2026-09-06");
    expect(
      critiqueCertificateDate({
        entry: { event_kind: "se", competition_day: "2026-09-04" },
        show: { date: "2026-09-04" },
        seDate: "2026-09-04",
      }),
    ).toBe("2026-09-04");
  });

  it("writes VP 4 on the puppy #7 certificate, not the stored vv code", async () => {
    const bytes = await buildTnrkCritiquePdfForRecords({
      show: {
        id: "show-1",
        name: "TNRK Sieger Show 2026",
        date: "2026-09-04",
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
        wt: "2026-04-15",
        owner: "Owner",
        sex: "H",
        class_id: "babyklasse",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "puppy-i",
        email: "",
      },
      se: {
        id: "se-7",
        show_id: "show-1",
        entry_id: "entry-7",
        status: "complete",
        created_at: "t",
        updated_at: "t",
        form: {
          ...createEmptyTnrkSeForm(),
          date: "2026-09-04",
          date_of_birth: "2026-04-15",
          dog_name: "Epic Rr Femme Fatale Diva",
        },
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
    const text = extractPdfText(bytes);
    expect(text).toMatch(/VP 4/);
    expect(text).toMatch(/Sep 5, 2026/);
    expect(text).toMatch(/4\/15\/2026/);
    expect(text).not.toMatch(/Apr 15, 2026/);
    expect(text).not.toMatch(/Sep 4, 2026/);
    expect(text).not.toMatch(/2026-09-04/);
  });
});
