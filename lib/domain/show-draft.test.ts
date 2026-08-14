import { describe, expect, it } from "vitest";
import { blankShowDraft, validateShowCreate } from "./show-draft";

describe("show-draft", () => {
  it("starts blank with ADRK and today's date", () => {
    const draft = blankShowDraft();
    expect(draft.name).toBe("");
    expect(draft.rulebook).toBe("adrk");
    expect(draft.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("requires name and at least one judge", () => {
    expect(validateShowCreate(blankShowDraft()).valid).toBe(false);
    expect(
      validateShowCreate({
        ...blankShowDraft(),
        name: "Blacksage Sieger 2026",
        venue: "Field A",
        judge: "Schmidt",
        judges: ["Schmidt"],
      }).valid,
    ).toBe(true);
    expect(
      validateShowCreate({
        ...blankShowDraft(),
        name: "Blacksage Sieger 2026",
        judges: ["", "  "],
      }).valid,
    ).toBe(false);
  });
});
