import { describe, expect, it } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import {
  critiqueExcerpt,
  dogResultsPath,
  dogResultDescription,
  facebookShowPost,
  getPublishedDog,
  getPublishedShow,
  listPublishedShows,
  ratingPlacementLabel,
  showResultsSlug,
  slugify,
} from "./public-results";
import { samplePublishedStore } from "./public-results.sample";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";

describe("public results slugs", () => {
  it("slugifies umlauts and punctuation", () => {
    expect(slugify("Rex vom Blacksage")).toBe("rex-vom-blacksage");
    expect(slugify("Bella von Ostsee — V1")).toBe("bella-von-ostsee-v1");
  });

  it("builds a stable show slug from name + date", () => {
    expect(
      showResultsSlug({
        name: "TNRK / RCC National Sieger Show",
        date: "2026-09-04",
      }),
    ).toBe("tnrk-rcc-national-sieger-show-2026-09-04");
  });
});

describe("rating vs placement", () => {
  it("joins Formwert and place as exhibitors write them", () => {
    expect(ratingPlacementLabel("V", 1)).toBe("V1");
    expect(ratingPlacementLabel("Sg", 2)).toBe("Sg2");
    expect(ratingPlacementLabel("V", null)).toBe("V");
    expect(ratingPlacementLabel(null, 3)).toBe("Place 3");
    expect(ratingPlacementLabel("vv", 4, "puppy")).toBe("VP4");
    expect(ratingPlacementLabel("V", 1, "puppy")).toBe("P1");
  });
});

describe("projection", () => {
  const store = samplePublishedStore();

  it("lists only published shows and strips PII", () => {
    const unpublished = {
      ...store,
      shows: store.shows.map((show) => ({
        ...show,
        results_published_at: undefined,
      })),
    };
    expect(listPublishedShows(unpublished)).toEqual([]);

    const [summary] = listPublishedShows(store);
    expect(summary.name).toBe("TNRK / RCC National Sieger Show");
    expect(summary.dogCount).toBe(3);
    expect(summary.placedCount).toBe(3);
    expect(JSON.stringify(summary)).not.toMatch(/@|email|audio/i);
  });

  it("groups dogs by class and sex with placements first", () => {
    const show = getPublishedShow(store, "tnrk-rcc-national-sieger-show-2026-09-04");
    expect(show?.divisions.map((d) => d.key)).toEqual([
      "offene-klasse:H",
      "jugendklasse-i:R",
    ]);
    const youth = show?.divisions.find((d) => d.key === "jugendklasse-i:R");
    expect(youth?.dogs.map((d) => d.dogName)).toEqual([
      "Rex vom Blacksage",
      "Axel vom Nordwald",
    ]);
    expect(youth?.dogs[0]?.ratingPlacement).toBe("V1");
  });

  it("uses the newest approved spoken letter when two certificates exist", () => {
    const older = store.critiques.find((c) => c.entry_id === "sample-rex");
    expect(older).toBeTruthy();
    const doubled = {
      ...store,
      critiques: [
        {
          ...older!,
          id: "sample-crit-rex-old",
          draft: {
            ...older!.draft,
            narrative: "Older take that should not publish.",
          },
          created_at: "2026-09-04T10:00:00.000Z",
          updated_at: "2026-09-04T10:00:00.000Z",
          approved_at: "2026-09-04T10:00:00.000Z",
        },
        ...store.critiques,
      ],
    };
    const rex = getPublishedDog(
      doubled,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(rex?.dog.narrative).toContain("Correct medium size");
    expect(rex?.dog.narrative).not.toContain("Older take");
  });

  it("omits unapproved critique text and never leaks owner email", () => {
    const dirty = {
      ...store,
      critiques: store.critiques.map((critique, index) =>
        index === 0
          ? { ...critique, status: "PENDING_REVIEW" as const }
          : critique,
      ),
      entries: store.entries.map((entry, index) =>
        index === 0 ? { ...entry, email: "secret@kennel.test" } : entry,
      ),
    };
    const rex = getPublishedDog(
      dirty,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(rex?.dog.narrative).toBeNull();
    expect(rex?.dog.formwert).toBeNull();
    expect(rex?.dog.placement).toBe(1);
    expect(rex?.dog.documents.map((document) => document.kind)).toEqual([
      "award",
    ]);
    expect(JSON.stringify(rex)).not.toContain("secret@kennel.test");
  });

  it("omits a missing class place from the share description", () => {
    const found = getPublishedDog(
      store,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    const description = dogResultDescription({
      ...found!.dog,
      ratingPlacement: "V",
      formwertLabel: "Excellent",
      placement: null,
    });
    expect(description).toContain("earned V (Excellent)");
    expect(description).not.toMatch(/place\s*null/i);
  });

  it("resolves a dog page and writes AEO-friendly copy", () => {
    const found = getPublishedDog(
      store,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.href).toBe(
      dogResultsPath(store.shows[0]!, store.entries[0]!),
    );
    expect(dogResultDescription(found!.dog)).toContain(
      "The letter is the Formwert rating",
    );
    expect(dogResultDescription(found!.dog)).toContain("Correct medium size");
    expect(found?.dog.narrative).toContain("Vorzüglich");
    expect(found?.dog.photoHref).toContain("/api/public/photos/sample-rex");
    expect(found?.dog.photoPath).toBe("sample-show/sample-rex.jpg");
    expect(found?.dog.health).toEqual([
      { label: "HD", value: "clear" },
      { label: "ED", value: "clear" },
      { label: "Eye", value: "clear" },
      { label: "Heart", value: "clear" },
      { label: "Registry", value: "OFA passing" },
      { label: "JLPP", value: "N/N" },
      { label: "NAD", value: "N/N" },
    ]);
    expect(found?.dog.documents.map((document) => document.kind)).toEqual([
      "critique",
      "award",
    ]);
    expect(found?.dog.documents[0]?.href).toContain(
      "/api/public/pdf?kind=critique",
    );
    expect(found?.dog.documents[0]?.label).toBe("Critique certificate");
    expect(found?.dog.documents[1]?.href).toContain(
      "/api/public/pdf?kind=award&show_id=sample-show&entry_id=sample-rex",
    );
  });

  it("does not publish SE form text as the critique letter", () => {
    const seDraft = {
      narrative:
        "SE overall appearance only\n\nSE steward comments\n\nSE result: PASS.",
      formwert: "V" as const,
      placement: null,
      titles: [],
      draftAssist: { note: "Synced from ringside SE form" },
    };
    const withSeCritique = {
      ...store,
      critiques: store.critiques.map((critique, index) =>
        index === 0
          ? {
              ...critique,
              transcript: "Ringside SE form",
              draft: seDraft,
            }
          : critique,
      ),
    };
    const found = getPublishedDog(
      withSeCritique,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.narrative).toBeNull();
    expect(found?.dog.documents.map((document) => document.kind)).toContain(
      "critique",
    );
    expect(JSON.stringify(found?.dog.narrative)).not.toContain(
      "SE overall appearance",
    );
  });

  it("shares a sibling photo onto the published SE result page", () => {
    const rex = store.entries[0]!;
    const withPhotoOnSibling = {
      ...store,
      entries: [
        { ...rex, photo_path: undefined },
        {
          ...rex,
          id: "sample-rex-sat",
          event_kind: "conformation" as const,
          photo_path: "sample-show/sample-rex-sat.jpg",
        },
        ...store.entries.slice(1),
      ],
    };
    const found = getPublishedDog(
      withPhotoOnSibling,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.photoPath).toBe("sample-show/sample-rex-sat.jpg");
    expect(found?.dog.photoHref).toContain("/api/public/photos/sample-rex-sat");
    expect(found?.dog.entryId).toBe("sample-rex");
  });

  it("shares SE health clearances onto the conformation page for the same dog", () => {
    const rex = store.entries[0]!;
    const withSeSibling = {
      ...store,
      entries: [
        { ...rex, health: undefined },
        {
          ...rex,
          id: "sample-rex-se",
          event_kind: "se" as const,
          catalog_class: "standard-evaluation" as const,
          health: {
            hd: "A1",
            ed: "clear",
            eye: "",
            heart: "",
            registry: "ADRK" as const,
            registry_status: "passing",
            jlpp: "N/N",
            nad: "",
          },
        },
        ...store.entries.slice(1),
      ],
    };
    const found = getPublishedDog(
      withSeSibling,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.health).toEqual([
      { label: "HD", value: "A1" },
      { label: "ED", value: "clear" },
      { label: "Registry", value: "ADRK passing" },
      { label: "JLPP", value: "N/N" },
    ]);
    expect(JSON.stringify(found)).not.toMatch(/@|email|audio/i);
  });

  it("lists a sibling SE PDF and uploaded attachment on the published page", () => {
    const rex = store.entries[0]!;
    const form = createEmptyTnrkSeForm();
    form.overall_appearance = "Correct medium size, strong and typey.";
    form.comments = "Self-confident.";
    form.final_result = "pass";
    const withDocs = {
      ...store,
      entries: [
        rex,
        {
          ...rex,
          id: "sample-rex-se",
          event_kind: "se" as const,
          catalog_class: "standard-evaluation" as const,
        },
        ...store.entries.slice(1),
      ],
      se_evaluations: [
        {
          id: "sample-se-rex",
          show_id: "sample-show",
          entry_id: "sample-rex-se",
          status: "draft" as const,
          form,
          created_at: "2026-09-04T14:00:00.000Z",
          updated_at: "2026-09-04T16:00:00.000Z",
        },
      ],
      dog_documents: [
        {
          id: "sample-doc-rex",
          show_id: "sample-show",
          dog_id: "sample-rex-se",
          path: "sample-show/docs/sample-rex-se/sample-doc-rex.pdf",
          filename: "clearances.pdf",
          content_type: "application/pdf" as const,
          created_at: "2026-09-04T12:00:00.000Z",
        },
      ],
    };
    const found = getPublishedDog(
      withDocs,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.documents.map((document) => document.kind)).toEqual([
      "critique",
      "se",
      "award",
      "attachment",
    ]);
    expect(found?.dog.documents.find((document) => document.kind === "se")?.href).toContain(
      "evaluation_id=sample-se-rex",
    );
    expect(
      found?.dog.documents.find((document) => document.kind === "attachment")
        ?.filename,
    ).toBe("clearances.pdf");
  });

  it("falls back to the legacy clearance line when structured health is empty", () => {
    const withLegacy = {
      ...store,
      entries: store.entries.map((entry, index) =>
        index === 0
          ? { ...entry, health: undefined, hd_ed_jlpp: "HD A, ED normal, JLPP N/N" }
          : entry,
      ),
    };
    const found = getPublishedDog(
      withLegacy,
      "tnrk-rcc-national-sieger-show-2026-09-04",
      "101-rex-vom-blacksage",
    );
    expect(found?.dog.health).toEqual([
      { label: "Clearances", value: "HD A, ED normal, JLPP N/N" },
    ]);
  });

  it("clips critique text on a word boundary for share cards", () => {
    expect(critiqueExcerpt(null)).toBeNull();
    expect(critiqueExcerpt("Short letter.")).toBe("Short letter.");
    const long = `${"Very typey head with a dark eye. ".repeat(20)}Vorzüglich.`;
    const excerpt = critiqueExcerpt(long, 80);
    expect(excerpt?.endsWith("…")).toBe(true);
    expect(excerpt!.length).toBeLessThanOrEqual(80);
    expect(excerpt).not.toContain("  ");
  });

  it("builds a Facebook post that names placements and the archive URL", () => {
    const show = getPublishedShow(
      store,
      "tnrk-rcc-national-sieger-show-2026-09-04",
    )!;
    const post = facebookShowPost(show, "https://example.com");
    expect(post).toContain("V1  Rex vom Blacksage");
    expect(post).toContain("https://example.com/results/tnrk-rcc-national-sieger-show-2026-09-04");
    expect(post).toContain("Results by Show Desk");
  });

  it("returns nothing from an empty store", () => {
    expect(listPublishedShows(EMPTY_STORE)).toEqual([]);
    expect(getPublishedShow(EMPTY_STORE, "missing")).toBeNull();
  });
});
