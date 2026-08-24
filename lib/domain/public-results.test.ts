import { describe, expect, it } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import {
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
    expect(JSON.stringify(rex)).not.toContain("secret@kennel.test");
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
    expect(found?.dog.narrative).toContain("Vorzüglich");
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
