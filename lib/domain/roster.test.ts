import { describe, expect, it } from "vitest";
import {
  mergeImportedEntries,
  parseRosterCsv,
  rosterCsvTemplate,
  validateRosterEntry,
  validateRosterEntryUpdate,
} from "./roster";
import type { RosterEntry } from "./roster";

describe("roster", () => {
  it("parses valid CSV with required headers", () => {
    const csv = rosterCsvTemplate();
    const result = parseRosterCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].armband).toBe("101");
    expect(result.entries[0].dog_name).toBe("Rex vom Test");
    expect(result.entries[0].sex).toBe("R");
    expect(result.entries[0].sire).toBe("Sire Name");
    expect(result.entries[0].dam).toBe("Dam Name");
    expect(result.entries[0].breeder).toBe("Breeder Name");
    expect(result.entries[0].address).toBe("123 Main St");
    expect(result.entries[0].hd_ed_jlpp).toBe("Hips: Excellent");
  });

  it("rejects missing headers", () => {
    const result = parseRosterCsv("armband,dog_name\n101,Rex");
    expect(result.entries).toHaveLength(0);
    expect(result.errors[0]).toMatch(/Missing headers/);
  });

  it("validates individual entries", () => {
    expect(
      validateRosterEntry({
        armband: "",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "",
      }).valid,
    ).toBe(false);

    expect(
      validateRosterEntry({
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "invalid-class",
        email: "",
      }).valid,
    ).toBe(false);
  });

  it("validates entry updates require id and show_id", () => {
    expect(
      validateRosterEntryUpdate({
        id: "",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "a@b.com",
      }).valid,
    ).toBe(false);

    expect(
      validateRosterEntryUpdate({
        id: "entry-1",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "not-an-email",
      }).valid,
    ).toBe(false);

    expect(
      validateRosterEntryUpdate({
        id: "entry-1",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "a@b.com",
      }).valid,
    ).toBe(true);
  });

  it("upserts CSV rows by show + armband instead of duplicating", () => {
    const existing: RosterEntry[] = [
      {
        id: "entry-keep",
        show_id: "show-1",
        armband: "101",
        dog_name: "Old Name",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "old@test.com",
        photo_path: "show-1/entry-keep.jpg",
      },
    ];
    const merged = mergeImportedEntries(
      existing,
      [
        {
          show_id: "show-1",
          armband: "101",
          dog_name: "Rex Updated",
          zb_number: "DE-1",
          wt: "2024-01-01",
          owner: "Owner",
          sex: "R",
          class_id: "zwischenklasse",
          email: "new@test.com",
        },
        {
          show_id: "show-1",
          armband: "102",
          dog_name: "New Dog",
          zb_number: "",
          wt: "",
          owner: "Owner",
          sex: "H",
          class_id: "zwischenklasse",
          email: "",
        },
      ],
      () => "entry-new",
    );
    expect(merged.added).toBe(1);
    expect(merged.updated).toBe(1);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[0].id).toBe("entry-keep");
    expect(merged.entries[0].dog_name).toBe("Rex Updated");
    expect(merged.entries[0].photo_path).toBe("show-1/entry-keep.jpg");
    expect(merged.entries[1].id).toBe("entry-new");
  });

  it("collects row-level errors without aborting", () => {
    const csv = `armband,dog_name,zb_number,wt,owner,sex,class_id,email
101,,DE-1,,Owner,R,zwischenklasse,owner@test.com
102,Rex,,,Owner,R,zwischenklasse,owner@test.com`;
    const result = parseRosterCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.entries).toHaveLength(1);
  });
});
