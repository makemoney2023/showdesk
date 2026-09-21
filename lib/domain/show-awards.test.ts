import { describe, expect, it } from "vitest";
import {
  awardAgeGroupForEntry,
  awardsForEntry,
  formatShowAwardLabels,
  normalizeShowAwards,
  toggleShowAward,
} from "./show-awards";

describe("awardAgeGroupForEntry", () => {
  it("maps puppy, youth, and adult catalog classes", () => {
    expect(
      awardAgeGroupForEntry({
        event_kind: "conformation",
        catalog_class: "puppy-ii",
        class_id: "juengstenklasse",
      }),
    ).toBe("puppy");
    expect(
      awardAgeGroupForEntry({
        event_kind: "conformation",
        catalog_class: "youth-i",
        class_id: "jugendklasse-i",
      }),
    ).toBe("youth");
    expect(
      awardAgeGroupForEntry({
        event_kind: "conformation",
        catalog_class: "open",
        class_id: "offene-klasse",
      }),
    ).toBe("adult");
  });

  it("skips Friday SE", () => {
    expect(
      awardAgeGroupForEntry({
        event_kind: "se",
        catalog_class: "standard-evaluation",
        class_id: "offene-klasse",
      }),
    ).toBeNull();
  });
});

describe("awardsForEntry", () => {
  it("gives puppy classes Best Puppy awards plus BOB and BOS", () => {
    expect(
      awardsForEntry({
        event_kind: "conformation",
        catalog_class: "puppy-i",
        class_id: "babyklasse",
      }).map((award) => award.label),
    ).toEqual([
      "Best Puppy Male",
      "Best Puppy Female",
      "Best Puppy in Show",
      "Best of Breed",
      "Best Opposite Sex",
    ]);
  });

  it("gives youth classes Youth Sieger titles plus BOB and BOS", () => {
    expect(
      awardsForEntry({
        event_kind: "conformation",
        catalog_class: "youth-ii",
        class_id: "jugendklasse-ii",
      }).map((award) => award.id),
    ).toEqual([
      "youth-sieger",
      "youth-siegerin",
      "best-of-breed",
      "best-opposite-sex",
    ]);
  });

  it("gives adult classes Sieger titles plus BOB and BOS", () => {
    expect(
      awardsForEntry({
        event_kind: "conformation",
        catalog_class: "champion",
        class_id: "championklasse",
      }).map((award) => award.label),
    ).toEqual([
      "Sieger",
      "Siegerin",
      "Best of Breed",
      "Best Opposite Sex",
    ]);
  });
});

describe("award list helpers", () => {
  it("normalizes, toggles, and labels stored awards", () => {
    expect(normalizeShowAwards(["sieger", "nope", "sieger"])).toEqual([
      "sieger",
    ]);
    expect(toggleShowAward(["sieger"], "best-of-breed")).toEqual([
      "sieger",
      "best-of-breed",
    ]);
    expect(toggleShowAward(["sieger", "best-of-breed"], "sieger")).toEqual([
      "best-of-breed",
    ]);
    expect(formatShowAwardLabels(["best-of-breed", "sieger"])).toEqual([
      "Sieger",
      "Best of Breed",
    ]);
  });
});
