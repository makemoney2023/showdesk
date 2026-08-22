import { describe, expect, it } from "vitest";
import { blankRosterEntryDraft } from "./roster-draft";
import { validateRosterEntry } from "./roster";

describe("blankRosterEntryDraft", () => {
  it("opens a create profile with empty dog/owner and suggested armband", () => {
    const draft = blankRosterEntryDraft("show-1", "105");
    expect(draft.id).toBe("");
    expect(draft.show_id).toBe("show-1");
    expect(draft.armband).toBe("105");
    expect(draft.dog_name).toBe("");
    expect(draft.owner).toBe("");
    expect(draft.competition_day).toBe("");
    expect(blankRosterEntryDraft("show-1", "105", "2026-08-22").competition_day).toBe(
      "2026-08-22",
    );
    // Incomplete until user fills required fields
    expect(validateRosterEntry(draft).valid).toBe(false);
  });
});
