import { describe, expect, it } from "vitest";
import { catalogMetadataError } from "./catalog-competition";
import { blankRosterEntryDraft } from "./roster-draft";
import { validateRosterEntry } from "./roster";
import { toEntryRow } from "@/lib/store/row-mappers";

describe("blankRosterEntryDraft", () => {
  it("opens a create profile with empty dog/owner and suggested armband", () => {
    const draft = blankRosterEntryDraft("show-1", "105");
    expect(draft.id).toBe("");
    expect(draft.show_id).toBe("show-1");
    expect(draft.armband).toBe("105");
    expect(draft.dog_name).toBe("");
    expect(draft.owner).toBe("");
    expect(draft.competition_day).toBe("");
    expect(draft.sire).toBe("");
    expect(draft.dam).toBe("");
    expect(blankRosterEntryDraft("show-1", "105", "2026-08-22").competition_day).toBe(
      "2026-08-22",
    );
    // Incomplete until user fills required fields
    expect(validateRosterEntry(draft).valid).toBe(false);
  });

  it("maps a filled scratch draft to hosted-safe pedigree columns", () => {
    const draft = {
      ...blankRosterEntryDraft("show-1", "172", "2026-09-05"),
      dog_name: "Scratch Rex",
      owner: "Scratch Owner",
      sex: "R" as const,
    };
    expect(validateRosterEntry(draft).valid).toBe(true);
    expect(catalogMetadataError(draft)).toBeNull();
    const row = toEntryRow({ ...draft, id: "entry-new" });
    expect(row.sire).toBe("");
    expect(row.dam).toBe("");
    expect(row.breeder).toBe("");
    expect(row.address).toBe("");
    expect(row.hd_ed_jlpp).toBe("");
    expect(row.competition_day).toBe("2026-09-05");
  });
});
