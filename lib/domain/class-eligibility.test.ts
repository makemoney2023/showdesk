import { describe, expect, it } from "vitest";
import {
  ageInMonths,
  classEligibilityWarning,
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
});
