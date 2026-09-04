import { describe, expect, it } from "vitest";
import { samplePublishedStore } from "@/lib/domain/public-results.sample";
import { publishedEntryForPhoto } from "./public-photo";

describe("publishedEntryForPhoto", () => {
  const store = samplePublishedStore();

  it("returns a published sample dog with an owned photo path", () => {
    const found = publishedEntryForPhoto(store, "sample-show", "sample-rex");
    expect(found?.entry.dog_name).toBe("Rex vom Blacksage");
    expect(found?.entry.photo_path).toBe("sample-show/sample-rex.jpg");
  });

  it("hides photos when the show is unpublished", () => {
    const unpublished = {
      ...store,
      shows: store.shows.map((show) => ({
        ...show,
        results_published_at: undefined,
      })),
    };
    expect(
      publishedEntryForPhoto(unpublished, "sample-show", "sample-rex"),
    ).toBeNull();
  });

  it("serves a sibling photo when the published row has none", () => {
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
    const found = publishedEntryForPhoto(
      withPhotoOnSibling,
      "sample-show",
      "sample-rex-sat",
    );
    expect(found?.entry.id).toBe("sample-rex-sat");
    expect(found?.entry.photo_path).toBe("sample-show/sample-rex-sat.jpg");
    expect(
      publishedEntryForPhoto(withPhotoOnSibling, "sample-show", "sample-rex")
        ?.entry.id,
    ).toBe("sample-rex-sat");
  });

  it("rejects a path that does not belong to the entry", () => {
    const tampered = {
      ...store,
      entries: store.entries.map((entry) =>
        entry.id === "sample-rex"
          ? { ...entry, photo_path: "sample-show/other.jpg" }
          : entry,
      ),
    };
    expect(
      publishedEntryForPhoto(tampered, "sample-show", "sample-rex"),
    ).toBeNull();
  });
});
