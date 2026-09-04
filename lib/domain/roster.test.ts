import { describe, expect, it } from "vitest";
import {
  createEntryRequirementError,
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

  it("moves titles out of the CSV dog name", () => {
    const csv = `armband,dog_name,zb_number,wt,owner,sex,class_id,email
101,CH Rex vom Test IGP1,,,Owner,R,zwischenklasse,`;
    const result = parseRosterCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.entries[0]?.dog_name).toBe("Rex vom Test");
    expect(result.entries[0]?.prefix_titles).toBe("CH");
    expect(result.entries[0]?.suffix_titles).toBe("IGP1");
  });

  it("requires microchip on create but treats SE health as optional", () => {
    expect(createEntryRequirementError({ microchip: "" })).toBe(
      "microchip is required",
    );
    expect(
      createEntryRequirementError({
        microchip: "123",
        se: true,
        health: { hd: "clear" },
      }),
    ).toBeNull();
    expect(
      createEntryRequirementError({
        microchip: "123",
        se: true,
        health: {},
      }),
    ).toBeNull();
    expect(
      createEntryRequirementError({
        microchip: "123",
        se: true,
        health: {
          hd: "clear",
          ed: "clear",
          eye: "clear",
          heart: "clear",
          registry: "OFA",
          registry_status: "passing",
          jlpp: "N/N",
          nad: "N/N",
        },
        documentFilenames: ["clearances.pdf"],
        documentTypes: ["application/pdf"],
      }),
    ).toBeNull();
  });

  it("rejects missing headers", () => {
    const result = parseRosterCsv("armband,dog_name\n101,Rex");
    expect(result.entries).toHaveLength(0);
    expect(result.errors[0]).toMatch(/Missing headers/);
  });

  it("normalizes documented sex aliases and rejects unknown values", () => {
    const csv = `armband,dog_name,zb_number,wt,owner,sex,class_id,email
101,Rex,,,Owner,male,zwischenklasse,
102,Bella,,,Owner,Hündin,zwischenklasse,
103,Unknown,,,Owner,X,zwischenklasse,`;
    const result = parseRosterCsv(csv);
    expect(result.entries.map((entry) => entry.sex)).toEqual(["R", "H"]);
    expect(result.errors).toEqual([
      'Row 4: sex must be R/H, male/female, or Rüde/Hündin (received "X")',
    ]);
  });

  it("rejects impossible catalog dates", () => {
    const csv = `armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class
101,Rex,,,Owner,R,zwischenklasse,,conformation,2026-02-31,youth-i`;
    const result = parseRosterCsv(csv);
    expect(result.entries).toHaveLength(0);
    expect(result.errors[0]).toMatch(/valid YYYY-MM-DD date/);
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
    expect(merged.changedDivisionEntryIds).toEqual([]);
  });

  it("reports imported entries that changed class or sex division", () => {
    const existing: RosterEntry[] = [
      {
        id: "entry-1",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "",
      },
    ];
    const merged = mergeImportedEntries(
      existing,
      [{ ...existing[0], sex: "H" as const }],
      () => "unused",
    );
    expect(merged.changedDivisionEntryIds).toEqual(["entry-1"]);
  });

  it("reports imported entries that changed catalog class on the same day", () => {
    const existing: RosterEntry[] = [
      {
        id: "entry-1",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "REG-1",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "",
        event_kind: "conformation",
        competition_day: "2026-09-05",
        catalog_class: "youth-i",
      },
    ];
    const merged = mergeImportedEntries(
      existing,
      [
        {
          ...existing[0],
          catalog_class: "youth-ii",
        },
      ],
      () => "unused",
    );
    expect(merged.updated).toBe(1);
    expect(merged.added).toBe(0);
    expect(merged.changedDivisionEntryIds).toEqual(["entry-1"]);
  });

  it("fills in a missing competition day on the same event without duplicating", () => {
    const existing: RosterEntry[] = [
      {
        id: "entry-1",
        show_id: "show-1",
        armband: "101",
        dog_name: "Rex",
        zb_number: "REG-1",
        wt: "",
        owner: "Owner",
        sex: "R",
        class_id: "zwischenklasse",
        email: "",
        event_kind: "conformation",
      },
    ];
    const merged = mergeImportedEntries(
      existing,
      [
        {
          ...existing[0],
          competition_day: "2026-09-06",
          catalog_class: "youth-i",
        },
      ],
      () => "unused",
    );
    expect(merged.updated).toBe(1);
    expect(merged.added).toBe(0);
    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0].competition_day).toBe("2026-09-06");
    expect(merged.changedDivisionEntryIds).toEqual(["entry-1"]);
  });

  it("keeps the same armband on Saturday and Sunday as separate entries", () => {
    const saturday: RosterEntry = {
      id: "entry-sat",
      show_id: "show-1",
      armband: "101",
      dog_name: "Rex",
      zb_number: "REG-1",
      wt: "",
      owner: "Owner",
      sex: "R",
      class_id: "zwischenklasse",
      email: "",
      event_kind: "conformation",
      competition_day: "2026-09-05",
      catalog_class: "youth-i",
    };
    const merged = mergeImportedEntries(
      [saturday],
      [
        {
          ...saturday,
          competition_day: "2026-09-06",
        },
      ],
      () => "entry-sun",
    );
    expect(merged.added).toBe(1);
    expect(merged.updated).toBe(0);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries.map((entry) => entry.competition_day)).toEqual([
      "2026-09-05",
      "2026-09-06",
    ]);
    expect(merged.changedDivisionEntryIds).toEqual([]);

    const incoming = {
      show_id: saturday.show_id,
      armband: saturday.armband,
      dog_name: saturday.dog_name,
      zb_number: saturday.zb_number,
      wt: saturday.wt,
      owner: saturday.owner,
      sex: saturday.sex,
      class_id: saturday.class_id,
      email: saturday.email,
      event_kind: saturday.event_kind,
      catalog_class: saturday.catalog_class,
    };
    let nextId = 0;
    const weekendCatalog = mergeImportedEntries(
      [],
      [
        { ...incoming, competition_day: "2026-09-05" },
        { ...incoming, competition_day: "2026-09-06" },
        {
          ...incoming,
          event_kind: "se" as const,
          competition_day: "2026-09-04",
        },
      ],
      () => `entry-${nextId++}`,
    );
    expect(weekendCatalog.added).toBe(3);
    expect(weekendCatalog.updated).toBe(0);
    expect(weekendCatalog.entries).toHaveLength(3);
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
