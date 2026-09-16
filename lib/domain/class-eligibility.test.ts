import { describe, expect, it } from "vitest";
import {
  ageInMonths,
  catalogClassOptionLabel,
  classEligibilityWarning,
  eligibleCatalogClasses,
  resolvedConformationClass,
  suggestCatalogClass,
} from "./class-eligibility";

describe("class eligibility", () => {
  it("counts whole months from date of birth", () => {
    expect(ageInMonths("2024-09-05", "2026-09-05")).toBe(24);
    expect(ageInMonths("2024-09-06", "2026-09-05")).toBe(23);
  });

  it("suggests Working for a 24-month dog with a performance title", () => {
    expect(
      suggestCatalogClass({
        dateOfBirth: "2024-09-05",
        onDate: "2026-09-05",
        suffixTitles: "IGP1",
      }),
    ).toBe("working");
  });

  it("suggests Champion when a prefix title is present", () => {
    expect(
      suggestCatalogClass({
        dateOfBirth: "2022-01-01",
        onDate: "2026-09-05",
        prefixTitles: "AM CH",
      }),
    ).toBe("champion");
  });

  it("hides 4–6 month puppy classes from a two-year-old", () => {
    const classes = eligibleCatalogClasses({
      dateOfBirth: "2024-09-05",
      onDate: "2026-09-05",
    });
    expect(classes).toEqual(["open"]);
    expect(classes).not.toContain("puppy-i");
    expect(classes).not.toContain("youth-i");
  });

  it("offers Youth II female, not puppy, at 20 months", () => {
    const classes = eligibleCatalogClasses({
      dateOfBirth: "2024-12-05",
      onDate: "2026-09-05",
    });
    expect(classes).toEqual(["youth-ii", "open"]);
    expect(
      catalogClassOptionLabel("youth-ii", "H"),
    ).toBe("Youth II — Female (Hündin) · 18–24 months");
  });

  it("waits for a date of birth before listing classes", () => {
    expect(
      eligibleCatalogClasses({ dateOfBirth: "", onDate: "2026-09-05" }),
    ).toEqual([]);
  });

  it("keeps Open for a two-year-old instead of the blank Youth I default", () => {
    expect(
      resolvedConformationClass({
        current: "youth-i",
        dateOfBirth: "2024-09-05",
        onDate: "2026-09-05",
      }),
    ).toBe("open");
  });

  it("warns when the secretary picks a different class", () => {
    const warning = classEligibilityWarning({
      catalogClass: "open",
      dateOfBirth: "2024-09-05",
      onDate: "2026-09-05",
      suffixTitles: "IGP1",
    });
    expect(warning).toMatch(/Open/);
    expect(warning).toMatch(/Working/);
  });

  it("does not warn when the class matches", () => {
    expect(
      classEligibilityWarning({
        catalogClass: "working",
        dateOfBirth: "2024-09-05",
        onDate: "2026-09-05",
        suffixTitles: "IGP1",
      }),
    ).toBeNull();
  });

  it("blocks an age-ineligible class instead of only warning", () => {
    expect(
      classEligibilityWarning({
        catalogClass: "puppy-i",
        dateOfBirth: "2024-09-05",
        onDate: "2026-09-05",
      }),
    ).toMatch(/not eligible/);
  });
});
