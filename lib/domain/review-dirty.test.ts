import { describe, expect, it } from "vitest";
import { isReviewDraftDirty } from "./review-dirty";

describe("isReviewDraftDirty", () => {
  it("is clean when narrative and rating match the saved draft", () => {
    expect(
      isReviewDraftDirty(
        { narrative: "Strong male", formwert: "V" },
        { narrative: "Strong male", formwert: "V" },
      ),
    ).toBe(false);
  });

  it("is dirty when the secretary edits narrative or rating", () => {
    expect(
      isReviewDraftDirty(
        { narrative: "Strong male", formwert: "V" },
        { narrative: "Strong male. Excellent gait.", formwert: "V" },
      ),
    ).toBe(true);
    expect(
      isReviewDraftDirty(
        { narrative: "Strong male", formwert: "V" },
        { narrative: "Strong male", formwert: "Sg" },
      ),
    ).toBe(true);
  });

  it("ignores an appended SE dump when comparing the spoken letter", () => {
    expect(
      isReviewDraftDirty(
        {
          narrative: "Strong male\n\n— SE form —\nSE steward notes",
          formwert: "V",
        },
        { narrative: "Strong male", formwert: "V" },
      ),
    ).toBe(false);
  });
});
