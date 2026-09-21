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

  it("prints the placements SE rating when the approved draft still has the old one", async () => {
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
        id: "entry-4",
        show_id: "show-1",
        armband: "4",
        dog_name: "The Great Gatsby Von Der Musikstadt",
        zb_number: "",
        wt: "2026-02-02",
        owner: "Rosann Bentley",
        sex: "R",
        class_id: "juengstenklasse",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "puppy-ii",
        email: "",
      },
      se: {
        id: "se-4",
        show_id: "show-1",
        entry_id: "entry-4",
        status: "draft",
        created_at: "t",
        updated_at: "t",
        form: {
          ...createEmptyTnrkSeForm(),
          formwert: "vv",
          date_of_birth: "2026-02-02",
          owner_co_owner: "Rosann Bentley",
        },
      },
      critique: {
        id: "crit-4",
        show_id: "show-1",
        entry_id: "entry-4",
        status: "APPROVED",
        transcript: "Promising male.",
        draft: {
          narrative: "Promising male.",
          formwert: "V",
          placement: null,
          titles: [],
        },
        delivery_status: "pending",
        created_at: "t",
        updated_at: "t",
      },
      placements: [{ entry_id: "entry-4", placement: 1 }],
    });
    const text = extractPdfText(bytes);
    expect(text).toMatch(/VP 1/);
    expect(text).not.toMatch(/\bP 1\b/);
  });

  it("prints this day's V, not Friday SE ne, on a Youth II certificate", async () => {
    const fridaySe = {
      ...createEmptyTnrkSeForm(),
      formwert: "ne" as const,
      overall_appearance: "Not exhibited in SE.",
      date_of_birth: "2024-11-06",
      owner_co_owner: "Marie Josee Gallant",
    };
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
        id: "entry-sun",
        show_id: "show-1",
        armband: "52",
        dog_name: "Von Stoisch's Holy Shining Quartz",
        zb_number: "",
        wt: "2024-11-06",
        owner: "Marie Josee Gallant",
        sex: "H",
        class_id: "jugendklasse",
        event_kind: "conformation",
        competition_day: "2026-09-06",
        catalog_class: "youth-ii",
        email: "",
      },
      se: {
        id: "se-fri",
        show_id: "show-1",
        entry_id: "entry-fri",
        status: "complete",
        created_at: "t",
        updated_at: "t",
        form: fridaySe,
      },
      appearanceSe: {
        id: "se-sun",
        show_id: "show-1",
        entry_id: "entry-sun",
        status: "draft",
        created_at: "t",
        updated_at: "t",
        form: { ...createEmptyTnrkSeForm(), formwert: "V" },
      },
      critique: {
        id: "crit-sun",
        show_id: "show-1",
        entry_id: "entry-sun",
        status: "APPROVED",
        transcript: "Scissor bite. Large female.",
        draft: {
          narrative: "Scissor bite. Large female.",
          formwert: "V",
          placement: 3,
          titles: [],
        },
        delivery_status: "pending",
        created_at: "t",
        updated_at: "t",
      },
      placements: [{ entry_id: "entry-sun", placement: 3 }],
    });
    const text = extractPdfText(bytes);
    expect(text).toMatch(/V 3/);
    expect(text).not.toMatch(/\bne 3\b/);
    expect(text).toMatch(/Sep 6, 2026/);
  });

  it("prints only the registered name, not prefix or suffix titles", async () => {
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
        id: "entry-20",
        show_id: "show-1",
        armband: "20",
        dog_name:
          "CANCH GRCHB, AMCH Eiriens Calendar Girl CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
        prefix_titles: "CAN CH GRCHB, AM CH",
        suffix_titles: "CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
        zb_number: "",
        wt: "2020-01-01",
        owner: "Dianna Contin",
        sex: "H",
        class_id: "championklasse",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "champion",
        email: "",
      },
      se: {
        id: "se-20",
        show_id: "show-1",
        entry_id: "entry-20",
        status: "complete",
        created_at: "t",
        updated_at: "t",
        form: {
          ...createEmptyTnrkSeForm(),
          dog_name:
            "CANCH GRCHB, AMCH Eiriens Calendar Girl CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
        },
      },
    });
    const text = extractPdfText(bytes);
    expect(text).toContain("Eiriens Calendar Girl");
    expect(text).not.toContain("CANCH GRCHB");
    expect(text).not.toContain("Eiriens Calendar Girl CGN");
    expect(text).not.toContain("GRUETS QUALIFIER");
  });

  it("prints only the registered name when a Youth CH kennel prefix is attached", async () => {
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
        id: "entry-8",
        show_id: "show-1",
        armband: "8",
        dog_name: "Urka Inc. Youth Ch. Ynes von der Wasserbödstädt",
        prefix_titles: "Urka Inc. Youth Ch.",
        suffix_titles: "",
        zb_number: "",
        wt: "2024-12-07",
        owner: "Owner",
        sex: "H",
        class_id: "jugendklasse",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "youth",
        email: "",
      },
    });
    const text = extractPdfText(bytes);
    expect(text).toContain("Ynes von der Wasserb");
    expect(text).not.toContain("Youth Ch");
    expect(text).not.toContain("Urka Inc");
  });

  it("prints Hamid on a Saturday male even when the SE form is signed by Reck", async () => {
    const bytes = await buildTnrkCritiquePdfForRecords({
      show: {
        id: "show-1",
        name: "TNRK Sieger Show 2026",
        date: "2026-09-05",
        venue: "Demo",
        judge: "Sandra Reck (ADRK)",
        judges: ["Sandra Reck (ADRK)", "Hamid Falah (FCI-France)"],
        rulebook: "adrk",
        created_at: "t",
      },
      entry: {
        id: "entry-sat-male",
        show_id: "show-1",
        armband: "22",
        dog_name: "Rex vom Blacksage",
        zb_number: "",
        wt: "2023-01-01",
        owner: "Owner",
        sex: "R",
        class_id: "offene-klasse",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "open",
        email: "",
      },
      se: {
        id: "se-fri",
        show_id: "show-1",
        entry_id: "entry-fri",
        status: "complete",
        created_at: "t",
        updated_at: "t",
        form: {
          ...createEmptyTnrkSeForm(),
          judge: "Sandra Reck (ADRK)",
          judge_signature: "Sandra Reck (ADRK)",
        },
      },
      critique: {
        id: "crit-sat",
        show_id: "show-1",
        entry_id: "entry-sat-male",
        status: "APPROVED",
        transcript: "Strong male.",
        draft: {
          narrative: "Strong male.",
          formwert: "V",
          placement: 1,
          titles: [],
        },
        delivery_status: "pending",
        created_at: "t",
        updated_at: "t",
        judge: "Sandra Reck (ADRK)",
      },
    });
    const text = extractPdfText(bytes);
    expect(text).toContain("Hamid Falah");
    expect(text).not.toContain("Sandra Reck");
  });

  it("prints Reck on a Friday SE certificate even when the form stored Hamid", async () => {
    const bytes = await buildTnrkCritiquePdfForRecords({
      show: {
        id: "show-1",
        name: "TNRK Sieger Show 2026",
        date: "2026-09-05",
        venue: "Demo",
        judge: "Hamid Falah (FCI-France)",
        judges: ["Hamid Falah (FCI-France)", "Sandra Reck (ADRK)"],
        rulebook: "adrk",
        created_at: "t",
      },
      entry: {
        id: "entry-se",
        show_id: "show-1",
        armband: "4",
        dog_name: "Rex vom Blacksage",
        zb_number: "",
        wt: "2023-01-01",
        owner: "Owner",
        sex: "R",
        class_id: "offene-klasse",
        event_kind: "se",
        competition_day: "2026-09-04",
        catalog_class: "standard-evaluation",
        email: "",
      },
      se: {
        id: "se-fri",
        show_id: "show-1",
        entry_id: "entry-se",
        status: "complete",
        created_at: "t",
        updated_at: "t",
        form: {
          ...createEmptyTnrkSeForm(),
          judge: "Hamid Falah (FCI-France)",
          judge_signature: "Hamid Falah (FCI-France)",
        },
      },
    });
    const text = extractPdfText(bytes);
    expect(text).toContain("Sandra Reck");
    expect(text).not.toContain("Hamid Falah");
  });
});
