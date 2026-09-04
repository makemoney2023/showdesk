import { describe, expect, it } from "vitest";
import { samplePublishedStore } from "@/lib/domain/public-results.sample";
import { deskEntryForPhoto } from "./desk-photo";

describe("deskEntryForPhoto", () => {
  const store = samplePublishedStore();

  it("returns the appearance that owns the photo", () => {
    const found = deskEntryForPhoto(store, "sample-show", "sample-rex");
    expect(found?.id).toBe("sample-rex");
    expect(found?.photo_path).toBe("sample-show/sample-rex.jpg");
  });

  it("serves a sibling photo when this appearance has none", () => {
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
    expect(
      deskEntryForPhoto(withPhotoOnSibling, "sample-show", "sample-rex")?.id,
    ).toBe("sample-rex-sat");
    expect(
      deskEntryForPhoto(withPhotoOnSibling, "sample-show", "sample-rex-sat")
        ?.id,
    ).toBe("sample-rex-sat");
  });

  it("rejects a path that does not belong to the source entry", () => {
    const tampered = {
      ...store,
      entries: store.entries.map((entry) =>
        entry.id === "sample-rex"
          ? { ...entry, photo_path: "sample-show/other.jpg" }
          : entry,
      ),
    };
    expect(deskEntryForPhoto(tampered, "sample-show", "sample-rex")).toBeNull();
  });
});
