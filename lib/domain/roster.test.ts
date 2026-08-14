import { describe, expect, it } from "vitest";
import {
  parseRosterCsv,
  rosterCsvTemplate,
  validateRosterEntry,
  validateRosterEntryUpdate,
} from "./roster";

describe("roster", () => {
  it("parses valid CSV with required headers", () => {
    const csv = rosterCsvTemplate();
    const result = parseRosterCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].armband).toBe("101");
    expect(result.entries[0].dog_name).toBe("Rex vom Test");
    expect(result.entries[0].sex).toBe("R");
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

  it("collects row-level errors without aborting", () => {
    const csv = `armband,dog_name,zb_number,wt,owner,sex,class_id,email
101,,DE-1,,Owner,R,zwischenklasse,owner@test.com
102,Rex,,,Owner,R,zwischenklasse,owner@test.com`;
    const result = parseRosterCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.entries).toHaveLength(1);
  });
});
