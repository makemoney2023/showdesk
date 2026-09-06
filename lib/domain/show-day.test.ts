import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  accountRoleLabel,
  classesWithDogs,
  formatDisplayDate,
  formatElapsed,
  labelQueuedItem,
  nextDogAfter,
  queueAgeLabel,
  queuedItemHref,
  queuedItemReviewLabel,
  seSectionProgress,
} from "./show-day";

describe("classesWithDogs", () => {
  it("returns only class ids that have at least one dog, in ADRK order", () => {
    expect(
      classesWithDogs([
        { class_id: "veteranenklasse" },
        { class_id: "zwischenklasse" },
        { class_id: "zwischenklasse" },
      ]),
    ).toEqual(["zwischenklasse", "veteranenklasse"]);
  });

  it("returns empty when the roster is empty", () => {
    expect(classesWithDogs([])).toEqual([]);
  });
});

describe("nextDogAfter", () => {
  const dogs = [
    { id: "a", armband: "102" },
    { id: "b", armband: "101" },
    { id: "c", armband: "103" },
  ];

  it("returns the next dog by armband after the current one", () => {
    expect(nextDogAfter(dogs, "b")).toBe("a");
    expect(nextDogAfter(dogs, "a")).toBe("c");
  });

  it("returns null on the last dog", () => {
    expect(nextDogAfter(dogs, "c")).toBeNull();
  });
});

describe("formatElapsed", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(12 * 60 + 3)).toBe("12:03");
  });
});

describe("queueAgeLabel", () => {
  const now = Date.parse("2026-08-14T14:10:00.000Z");

  it("uses minutes for recent items", () => {
    expect(queueAgeLabel("2026-08-14T14:08:00.000Z", now)).toBe("2 min ago");
  });

  it("uses just now under a minute", () => {
    expect(queueAgeLabel("2026-08-14T14:09:40.000Z", now)).toBe("Just now");
  });
});

describe("labelQueuedItem", () => {
  it("joins the roster dog and age", () => {
    const labeled = labelQueuedItem(
      { entryId: "e1", createdAt: "2026-08-14T14:08:00.000Z" },
      [{ id: "e1", dog_name: "Rex Happy Path", armband: "101" }],
      Date.parse("2026-08-14T14:10:00.000Z"),
    );
    expect(labeled.title).toBe("#101 Rex Happy Path");
    expect(labeled.subtitle).toBe("2 min ago");
  });

  it("falls back when the entry is missing", () => {
    const labeled = labelQueuedItem(
      { entryId: "missing", createdAt: "2026-08-14T14:09:40.000Z" },
      [],
      Date.parse("2026-08-14T14:10:00.000Z"),
    );
    expect(labeled.title).toBe("Unknown dog");
    expect(labeled.subtitle).toBe("Just now");
  });

  it("names SE drafts in the subtitle", () => {
    const labeled = labelQueuedItem(
      {
        entryId: "e1",
        createdAt: "2026-08-14T14:08:00.000Z",
        kind: "se",
      },
      [{ id: "e1", dog_name: "Rex Happy Path", armband: "101" }],
      Date.parse("2026-08-14T14:10:00.000Z"),
    );
    expect(labeled.subtitle).toBe("SE draft · 2 min ago");
  });
});

describe("queuedItemHref", () => {
  it("opens the SE form for a queued draft", () => {
    expect(queuedItemHref({ entryId: "e1", kind: "se" })).toBe(
      "/ringside/se/e1",
    );
  });

  it("opens Review for a queued recording so the critique can be edited", () => {
    expect(queuedItemHref({ entryId: "e2", kind: "recording" })).toBe(
      "/admin/review?entry=e2",
    );
  });
});

describe("queuedItemReviewLabel", () => {
  it("names the queue action that reopens the draft", () => {
    expect(queuedItemReviewLabel()).toBe("Back to review");
  });
});

describe("seSectionProgress", () => {
  it("reports seven sections and zero filled on an empty form", () => {
    const sections = seSectionProgress(createEmptyTnrkSeForm());
    expect(sections.map((s) => s.id)).toEqual([
      "identification",
      "pedigree",
      "measurements",
      "bite",
      "appearance",
      "ratings",
      "result",
    ]);
    const id = sections.find((s) => s.id === "identification");
    expect(id?.filled).toBe(1);
    expect(sections.filter((s) => s.id !== "identification").every((s) => s.filled === 0)).toBe(
      true,
    );
    expect(sections.every((s) => s.total > 0)).toBe(true);
  });

  it("counts filled identification fields", () => {
    const form = createEmptyTnrkSeForm();
    form.dog_name = "Rex";
    form.judge = "Müller";
    const id = seSectionProgress(form).find((s) => s.id === "identification");
    expect(id?.filled).toBe(3);
  });
});

describe("formatDisplayDate", () => {
  it("formats ISO calendar dates without leaking the raw value", () => {
    expect(formatDisplayDate("2026-08-21")).toBe("Aug 21, 2026");
    expect(formatDisplayDate("")).toBe("");
    expect(formatDisplayDate("not-a-date")).toBe("not-a-date");
  });
});

describe("accountRoleLabel", () => {
  it("labels the current chrome, not a login link", () => {
    expect(accountRoleLabel("secretary")).toBe("Secretary");
    expect(accountRoleLabel("steward")).toBe("Steward");
    expect(accountRoleLabel("minimal")).toBeNull();
  });
});
