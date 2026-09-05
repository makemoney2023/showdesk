import { describe, expect, it } from "vitest";
import { samplePublishedStore } from "@/lib/domain/public-results.sample";
import { resolvePublishedPdfRecords } from "./public-pdf";

describe("resolvePublishedPdfRecords", () => {
  const store = samplePublishedStore();

  it("serves an approved critique and award for a published dog", () => {
    const critique = resolvePublishedPdfRecords(store, {
      kind: "critique",
      showId: "sample-show",
      critiqueId: "sample-crit-rex",
    });
    expect(critique?.entry.dog_name).toBe("Rex vom Blacksage");
    expect(critique?.critique?.id).toBe("sample-crit-rex");

    const award = resolvePublishedPdfRecords(store, {
      kind: "award",
      showId: "sample-show",
      entryId: "sample-rex",
    });
    expect(award?.kind).toBe("award");
    expect(award?.entry.id).toBe("sample-rex");
  });

  it("hides PDFs when the show is unpublished", () => {
    const unpublished = {
      ...store,
      shows: store.shows.map((show) => ({
        ...show,
        results_published_at: undefined,
      })),
    };
    expect(
      resolvePublishedPdfRecords(unpublished, {
        kind: "critique",
        showId: "sample-show",
        critiqueId: "sample-crit-rex",
      }),
    ).toBeNull();
  });

  it("rejects an unapproved critique", () => {
    const pending = {
      ...store,
      critiques: store.critiques.map((critique) =>
        critique.id === "sample-crit-rex"
          ? { ...critique, status: "PENDING_REVIEW" as const }
          : critique,
      ),
    };
    expect(
      resolvePublishedPdfRecords(pending, {
        kind: "critique",
        showId: "sample-show",
        critiqueId: "sample-crit-rex",
      }),
    ).toBeNull();
  });

  it("rejects an award when the dog did not place", () => {
    const noPlace = {
      ...store,
      placements: store.placements.filter(
        (placement) => placement.entry_id !== "sample-axel",
      ),
    };
    expect(
      resolvePublishedPdfRecords(noPlace, {
        kind: "award",
        showId: "sample-show",
        entryId: "sample-axel",
      }),
    ).toBeNull();
  });
});
