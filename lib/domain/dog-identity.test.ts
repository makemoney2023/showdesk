import { describe, expect, it } from "vitest";
import { showWeekendDays } from "./show-weekend";
import {
  buildDogAppearances,
  conformationDaysForDog,
  dogKey,
  entriesForDog,
  identityFromEntry,
  photoSourceForDog,
  sameDogIdentity,
  seConformationAsterisk,
  syncIdentityToDog,
} from "./dog-identity";
import type { RosterEntryRecord } from "@/lib/types";

const identity = {
  dog_name: "Calendar Girl",
  zb_number: "AKC-WS81829502",
  wt: "2024-09-05",
  owner: "Dianna Contin",
  email: "owner@example.com",
  sex: "H" as const,
  suffix_titles: "IGP1",
  microchip: "123",
};

function entry(
  overrides: Partial<RosterEntryRecord> & Pick<RosterEntryRecord, "id">,
): RosterEntryRecord {
  return {
    show_id: "show-1",
    armband: "50",
    dog_name: "Calendar Girl",
    zb_number: "AKC-WS81829502",
    wt: "2024-09-05",
    owner: "Dianna Contin",
    email: "",
    sex: "H",
    class_id: "gebrauchshundklasse",
    ...overrides,
  };
}

describe("dog identity", () => {
  it("stores the registered name without titles", () => {
    const identity = identityFromEntry({
      dog_name: "AM CH Calendar Girl IGP1",
      zb_number: "AKC-WS81829502",
      wt: "2024-09-05",
      owner: "Dianna Contin",
      email: "",
      sex: "H",
    });
    expect(identity.dog_name).toBe("Calendar Girl");
    expect(identity.prefix_titles).toBe("AM CH");
    expect(identity.suffix_titles).toBe("IGP1");
  });

  it("builds SE + Sat appearances that share the conformation armband", () => {
    let n = 0;
    const rows = buildDogAppearances({
      dogId: "dog-1",
      showId: "show-1",
      identity,
      catalogClass: "working",
      weekend: showWeekendDays("2026-09-05"),
      days: { se: true, saturday: true, sunday: false },
      armbands: { se: "50", saturday: "50" },
      newId: () => `entry-${++n}`,
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.event_kind).sort()).toEqual([
      "conformation",
      "se",
    ]);
    expect(new Set(rows.map((row) => row.armband))).toEqual(new Set(["50"]));
    expect(rows.every((row) => row.dog_id === "dog-1")).toBe(true);
    expect(
      rows.find((row) => row.event_kind === "se")?.catalog_class,
    ).toBe("standard-evaluation");
  });

  it("marks SE dogs that also show conformation", () => {
    const weekend = showWeekendDays("2026-09-05");
    const entries = [
      entry({
        id: "se",
        dog_id: "dog-1",
        event_kind: "se",
        competition_day: weekend.se,
      }),
      entry({
        id: "sat",
        dog_id: "dog-1",
        event_kind: "conformation",
        competition_day: weekend.saturday,
      }),
      entry({
        id: "sun",
        dog_id: "dog-1",
        event_kind: "conformation",
        competition_day: weekend.sunday,
        armband: "61",
      }),
    ];
    expect(conformationDaysForDog(entries, entries[0], weekend)).toEqual([
      "saturday",
      "sunday",
    ]);
    expect(seConformationAsterisk(["saturday", "sunday"])).toMatch(/both|and/i);
  });

  it("links appearances by registered name when ids and numbers are missing", () => {
    expect(
      sameDogIdentity(
        { dog_name: "AM CH Calendar Girl IGP1" },
        { dog_name: "Calendar Girl" },
      ),
    ).toBe(true);
    expect(
      sameDogIdentity(
        { dog_name: "Calendar Girl", zb_number: "AKC-1" },
        { dog_name: "Calendar Girl", zb_number: "AKC-2" },
      ),
    ).toBe(false);
    expect(
      sameDogIdentity({ dog_name: "Calendar Girl" }, { dog_name: "Other Dog" }),
    ).toBe(false);
    expect(sameDogIdentity({ dog_name: "" }, { dog_name: "" })).toBe(false);
    expect(dogKey({ id: "se-4", dog_name: "Calendar Girl" })).toBe(
      "name:calendar girl",
    );
    expect(dogKey({ id: "sat-22", dog_name: "AM CH Calendar Girl IGP1" })).toBe(
      "name:calendar girl",
    );
  });

  it("does not treat matching armbands as the same dog", () => {
    const se = entry({
      id: "se-4",
      armband: "4",
      dog_name: "Calendar Girl",
      zb_number: "",
      microchip: "",
      event_kind: "se",
    });
    const other = entry({
      id: "sat-4",
      armband: "4",
      dog_name: "Other Dog",
      zb_number: "",
      microchip: "",
      event_kind: "conformation",
    });
    expect(sameDogIdentity(se, other)).toBe(false);
    expect(entriesForDog([se, other], se).map((item) => item.id)).toEqual([
      "se-4",
    ]);
  });

  it("links appearances by registration when dog_id is missing (CSV imports)", () => {
    const weekend = showWeekendDays("2026-09-05");
    const entries = [
      entry({
        id: "se",
        event_kind: "se",
        competition_day: weekend.se,
      }),
      entry({
        id: "sat",
        event_kind: "conformation",
        competition_day: weekend.saturday,
      }),
    ];
    expect(conformationDaysForDog(entries, entries[0], weekend)).toEqual([
      "saturday",
    ]);
  });

  it("links SE #4 to conformation #22 by name when numbers differ", () => {
    const weekend = showWeekendDays("2026-09-05");
    const entries = [
      entry({
        id: "se-4",
        armband: "4",
        dog_name: "AM CH Calendar Girl IGP1",
        zb_number: "",
        microchip: "",
        event_kind: "se",
        competition_day: weekend.se,
      }),
      entry({
        id: "sat-22",
        armband: "22",
        dog_name: "Calendar Girl",
        zb_number: "",
        microchip: "",
        event_kind: "conformation",
        competition_day: weekend.saturday,
      }),
    ];
    expect(conformationDaysForDog(entries, entries[0], weekend)).toEqual([
      "saturday",
    ]);
    expect(entriesForDog(entries, entries[1]).map((item) => item.id).sort()).toEqual(
      ["sat-22", "se-4"],
    );
  });

  it("uses a sibling photo when this appearance has none", () => {
    const se = entry({ id: "se", dog_id: "dog-1", event_kind: "se" });
    const sat = entry({
      id: "sat",
      dog_id: "dog-1",
      photo_path: "show-1/sat.jpg",
    });
    expect(photoSourceForDog([se, sat], se)?.id).toBe("sat");
    expect(photoSourceForDog([se, sat], sat)?.id).toBe("sat");
  });

  it("never copies a sibling's photo path during identity sync", () => {
    const source = entry({
      id: "sat",
      dog_id: "dog-1",
      photo_path: "show-1/sat.jpg",
      owner: "New Owner",
    });
    const synced = syncIdentityToDog(
      [
        source,
        entry({
          id: "se",
          dog_id: "dog-1",
          event_kind: "se",
          photo_path: "show-1/se.jpg",
        }),
      ],
      source,
    );
    expect(synced[1].photo_path).toBe("show-1/se.jpg");
    expect(synced[1].owner).toBe("New Owner");
  });

  it("copies identity edits onto every appearance of the dog", () => {
    const source = entry({
      id: "sat",
      dog_id: "dog-1",
      owner: "New Owner",
      microchip: "999",
    });
    const synced = syncIdentityToDog(
      [
        source,
        entry({
          id: "se",
          dog_id: "dog-1",
          event_kind: "se",
          owner: "Old Owner",
        }),
      ],
      source,
    );
    expect(synced[1].owner).toBe("New Owner");
    expect(synced[1].microchip).toBe("999");
  });
});
