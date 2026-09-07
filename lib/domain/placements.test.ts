import { describe, expect, it } from "vitest";
import {
  applyFormwertUpdates,
  assignClassPlacement,
  dirtyFormwertEntryIds,
  dirtyPlacementPoolKeys,
  formwertSortRank,
  incompletePlacementScopeError,
  initialPlacementSelections,
  placementEntriesBelongToShow,
  placementRowsForPools,
  placementsSuggestedFromFormwert,
  resolveFormwertInputs,
  resolvePlacementInputs,
  resolveFormwertByEntryId,
  sortDogsForPlacement,
  upsertPlacements,
} from "./placements";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
} from "@/lib/types";

describe("upsertPlacements", () => {
  it("replaces placement for same entry in show", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e1",
        placement: 1,
      },
      {
        id: "p2",
        show_id: "s2",
        class_id: "zwischenklasse",
        sex: "R",
        entry_id: "e9",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e1",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "",
          catalog_class: "youth-i",
          placement: 3,
        },
      ],
      () => "p-new",
    );
    expect(next.find((p) => p.show_id === "s2")?.placement).toBe(2);
    expect(next.find((p) => p.entry_id === "e1")?.placement).toBe(3);
  });

  it("clears placement when null", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "H",
        entry_id: "e1",
        placement: 1,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e1",
          class_id: "zwischenklasse",
          sex: "H",
          competition_day: "",
          catalog_class: "youth-i",
          placement: null,
        },
      ],
      () => "p-new",
    );
    expect(next.filter((p) => p.show_id === "s1")).toHaveLength(0);
  });

  it("replaces only the submitted division and leaves other days intact", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p-sat",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "2026-09-05",
        catalog_class: "youth-i",
        entry_id: "sat",
        placement: 1,
      },
      {
        id: "p-sun",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "2026-09-06",
        catalog_class: "youth-i",
        entry_id: "sun",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "sat",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "2026-09-05",
          catalog_class: "youth-i",
          placement: 3,
        },
      ],
      () => "p-new",
    );
    expect(next.find((placement) => placement.entry_id === "sun")?.placement).toBe(
      2,
    );
    expect(next.find((placement) => placement.entry_id === "sat")).toEqual({
      id: "p-new",
      show_id: "s1",
      class_id: "zwischenklasse",
      sex: "R",
      competition_day: "2026-09-05",
      catalog_class: "youth-i",
      entry_id: "sat",
      placement: 3,
    });
  });

  it("clears other ranks in a submitted pool when they are omitted as null", () => {
    const existing: PlacementRecord[] = [
      {
        id: "p1",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "",
        catalog_class: "youth-i",
        entry_id: "e1",
        placement: 1,
      },
      {
        id: "p2",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "",
        catalog_class: "youth-i",
        entry_id: "e2",
        placement: 2,
      },
    ];
    const next = upsertPlacements(
      existing,
      "s1",
      [
        {
          entry_id: "e1",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "",
          catalog_class: "youth-i",
          placement: null,
        },
        {
          entry_id: "e2",
          class_id: "zwischenklasse",
          sex: "R",
          competition_day: "",
          catalog_class: "youth-i",
          placement: 1,
        },
      ],
      () => "p-new",
    );
    expect(next.filter((placement) => placement.show_id === "s1")).toEqual([
      {
        id: "p-new",
        show_id: "s1",
        class_id: "zwischenklasse",
        sex: "R",
        competition_day: "",
        catalog_class: "youth-i",
        entry_id: "e2",
        placement: 1,
      },
    ]);
  });
});

describe("placement save scope", () => {
  const saturday = {
    id: "sat",
    show_id: "s1",
    class_id: "zwischenklasse" as const,
    sex: "R" as const,
    event_kind: "conformation" as const,
    competition_day: "2026-09-05",
    catalog_class: "youth-i" as const,
  };
  const sunday = {
    id: "sun",
    show_id: "s1",
    class_id: "zwischenklasse" as const,
    sex: "R" as const,
    event_kind: "conformation" as const,
    competition_day: "2026-09-06",
    catalog_class: "youth-i" as const,
  };

  it("detects only the pools the steward actually changed", () => {
    expect(
      dirtyPlacementPoolKeys(
        [saturday, sunday],
        { sat: 1, sun: 2 },
        { sat: 1, sun: 1 },
      ),
    ).toEqual(["2026-09-06:youth-i:R"]);
  });

  it("builds a payload for those pools only", () => {
    expect(
      placementRowsForPools(
        [saturday, sunday],
        { sat: 1, sun: 2 },
        ["2026-09-06:youth-i:R"],
      ),
    ).toEqual([{ entry_id: "sun", placement: 2 }]);
  });

  it("rejects a scoped save that omits a dog from the submitted pool", () => {
    const maleA = { ...saturday, id: "m1" };
    const maleB = { ...saturday, id: "m2" };
    expect(
      incompletePlacementScopeError(
        [
          {
            entry_id: "m1",
            placement: 1,
            class_id: "zwischenklasse",
            sex: "R",
            competition_day: "2026-09-05",
            catalog_class: "youth-i",
          },
        ],
        [maleA, maleB, sunday],
        "s1",
      ),
    ).toMatch(/every dog in the saved division/);
    expect(
      incompletePlacementScopeError(
        [
          {
            entry_id: "m1",
            placement: 1,
            class_id: "zwischenklasse",
            sex: "R",
            competition_day: "2026-09-05",
            catalog_class: "youth-i",
          },
          {
            entry_id: "m2",
            placement: null,
            class_id: "zwischenklasse",
            sex: "R",
            competition_day: "2026-09-05",
            catalog_class: "youth-i",
          },
        ],
        [maleA, maleB, sunday],
        "s1",
      ),
    ).toBeNull();
  });
});

describe("formwertSortRank", () => {
  it("ranks vv best and unrated last", () => {
    expect(formwertSortRank("vv")).toBeLessThan(formwertSortRank("V"));
    expect(formwertSortRank("V")).toBeLessThan(formwertSortRank("Sg"));
    expect(formwertSortRank("Sg")).toBeLessThan(formwertSortRank("G"));
    expect(formwertSortRank("G")).toBeLessThan(formwertSortRank(null));
    expect(formwertSortRank(null)).toBe(formwertSortRank(undefined));
  });
});

describe("sortDogsForPlacement", () => {
  it("orders dogs by Formwert then armband", () => {
    const dogs = [
      { id: "e1", armband: "12", dog_name: "A" },
      { id: "e2", armband: "3", dog_name: "B" },
      { id: "e3", armband: "7", dog_name: "C" },
      { id: "e4", armband: "1", dog_name: "D" },
    ];
    const sorted = sortDogsForPlacement(dogs, {
      e1: "Sg",
      e2: "V",
      e3: "V",
      e4: null,
    });
    expect(sorted.map((d) => d.id)).toEqual(["e2", "e3", "e1", "e4"]);
  });
});

describe("resolveFormwertByEntryId", () => {
  it("uses the newest critique formwert per entry", () => {
    expect(
      resolveFormwertByEntryId([
        {
          entry_id: "e1",
          updated_at: "2026-08-01T10:00:00.000Z",
          draft: { formwert: "Sg" },
        },
        {
          entry_id: "e1",
          updated_at: "2026-08-02T10:00:00.000Z",
          draft: { formwert: "V" },
        },
      ]),
    ).toEqual({ e1: "V" });
  });

  it("lets a saved SE Formwert win over a critique transcript guess", () => {
    expect(
      resolveFormwertByEntryId(
        [
          {
            entry_id: "e1",
            updated_at: "2026-08-02T10:00:00.000Z",
            draft: { formwert: "V" },
          },
        ],
        [{ entry_id: "e1", form: { formwert: "Sg" } }],
      ),
    ).toEqual({ e1: "Sg" });
  });

  it("uses the SE Formwert when the dog is not in the review queue yet", () => {
    expect(
      resolveFormwertByEntryId([], [{ entry_id: "e1", form: { formwert: "V" } }]),
    ).toEqual({ e1: "V" });
  });

  it("copies a Friday SE rating onto Saturday and Sunday appearances", () => {
    const entries = [
      {
        id: "se",
        show_id: "s1",
        dog_id: "rex",
        event_kind: "se" as const,
        dog_name: "Rex",
      },
      {
        id: "sat",
        show_id: "s1",
        dog_id: "rex",
        event_kind: "conformation" as const,
        dog_name: "Rex",
      },
    ];
    expect(
      resolveFormwertByEntryId(
        [],
        [{ entry_id: "se", form: { formwert: "Sg" } }],
        entries,
      ),
    ).toEqual({ se: "Sg", sat: "Sg" });
  });
});

describe("placementsSuggestedFromFormwert", () => {
  it("assigns 1–4 within each class from Formwert order", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "a", armband: "2", class_id: "zwischenklasse", sex: "R" },
        { id: "b", armband: "1", class_id: "zwischenklasse", sex: "R" },
        { id: "c", armband: "3", class_id: "zwischenklasse", sex: "R" },
        { id: "d", armband: "4", class_id: "zwischenklasse", sex: "R" },
        { id: "e", armband: "5", class_id: "zwischenklasse", sex: "R" },
        { id: "f", armband: "9", class_id: "offene-klasse", sex: "H" },
        { id: "g", armband: "8", class_id: "offene-klasse", sex: "H" },
      ],
      {
        a: "Sg",
        b: "V",
        c: "vv",
        d: "G",
        e: "V",
        f: "V",
        g: "Sg",
      },
    );
    expect(suggested).toEqual([
      { entry_id: "c", placement: 1 },
      { entry_id: "b", placement: 2 },
      { entry_id: "e", placement: 3 },
      { entry_id: "a", placement: 4 },
      { entry_id: "d", placement: null },
      { entry_id: "f", placement: 1 },
      { entry_id: "g", placement: 2 },
    ]);
  });

  it("rejects placements for dogs that are not on the show", () => {
    expect(
      placementEntriesBelongToShow(
        [{ entry_id: "e1", class_id: "zwischenklasse", placement: 1 }],
        [
          {
            id: "e1",
            show_id: "other",
            class_id: "zwischenklasse",
            sex: "R",
          },
        ],
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("rejects class_id that does not match the roster row", () => {
    expect(
      placementEntriesBelongToShow(
        [{ entry_id: "e1", class_id: "offene-klasse", placement: 1 }],
        [
          {
            id: "e1",
            show_id: "s1",
            class_id: "zwischenklasse",
            sex: "R",
          },
        ],
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("skips unrated dogs when assigning top-4", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "a", armband: "1", class_id: "zwischenklasse", sex: "H" },
        { id: "b", armband: "2", class_id: "zwischenklasse", sex: "H" },
      ],
      { a: null, b: "V" },
    );
    expect(suggested).toEqual([
      { entry_id: "b", placement: 1 },
      { entry_id: "a", placement: null },
    ]);
  });

  it("auto-fills 1–4 from ratings when nothing is saved yet", () => {
    const dogs = [
      { id: "a", armband: "2", class_id: "zwischenklasse" as const, sex: "R" as const },
      { id: "b", armband: "1", class_id: "zwischenklasse" as const, sex: "R" as const },
    ];
    expect(
      initialPlacementSelections([], dogs, { a: "Sg", b: "V" }),
    ).toEqual({ b: 1, a: 2 });
  });

  it("keeps saved placements instead of overwriting them from ratings", () => {
    const dogs = [
      { id: "a", armband: "2", class_id: "zwischenklasse" as const, sex: "R" as const },
      { id: "b", armband: "1", class_id: "zwischenklasse" as const, sex: "R" as const },
    ];
    expect(
      initialPlacementSelections(
        [{ entry_id: "a", placement: 1 }],
        dogs,
        { a: "Sg", b: "V" },
      ),
    ).toEqual({ a: 1 });
  });

  it("assigns male and female place 1 independently", () => {
    const suggested = placementsSuggestedFromFormwert(
      [
        { id: "male", armband: "1", class_id: "offene-klasse", sex: "R" },
        { id: "female", armband: "2", class_id: "offene-klasse", sex: "H" },
      ],
      { male: "V", female: "V" },
    );
    expect(suggested).toEqual([
      { entry_id: "male", placement: 1 },
      { entry_id: "female", placement: 1 },
    ]);
  });

  it("rejects duplicate places inside one division but allows them across sex", () => {
    const entries = [
      {
        id: "m1",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "m2",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "f1",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
      },
    ];
    expect(
      resolvePlacementInputs(
        [
          { entry_id: "m1", placement: 1 },
          { entry_id: "f1", placement: 1 },
        ],
        entries,
        "s1",
      ).valid,
    ).toBe(true);
    expect(
      resolvePlacementInputs(
        [
          { entry_id: "m1", placement: 1 },
          { entry_id: "m2", placement: 1 },
        ],
        entries,
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("accepts legacy rows next to catalog entries in one save", () => {
    // A scratch add carries catalog metadata; legacy imports do not. The
    // full-show save must not reject the legacy rows.
    const entries = [
      {
        id: "legacy",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
      },
      {
        id: "scratch",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
    ];
    const result = resolvePlacementInputs(
      [
        { entry_id: "legacy", placement: 1 },
        { entry_id: "scratch", placement: 1 },
      ],
      entries,
      "s1",
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rows.map((row) => row.competition_day)).toEqual([
        "",
        "2026-09-05",
      ]);
    }
  });

  it("still rejects a catalog entry that is missing its competition day", () => {
    const entries = [
      {
        id: "no-day",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "R" as const,
        event_kind: "conformation" as const,
        catalog_class: "open" as const,
      },
    ];
    const result = resolvePlacementInputs(
      [{ entry_id: "no-day", placement: 1 }],
      entries,
      "s1",
    );
    expect(result.valid).toBe(false);
  });

  it("allows the same place on Saturday and Sunday", () => {
    const entries = [
      {
        id: "sat",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-05",
        catalog_class: "open" as const,
      },
      {
        id: "sun",
        show_id: "s1",
        class_id: "offene-klasse" as const,
        sex: "H" as const,
        event_kind: "conformation" as const,
        competition_day: "2026-09-06",
        catalog_class: "open" as const,
      },
    ];
    const result = resolvePlacementInputs(
      [
        { entry_id: "sat", placement: 1 },
        { entry_id: "sun", placement: 1 },
      ],
      entries,
      "s1",
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.rows.map((row) => row.competition_day)).toEqual([
        "2026-09-05",
        "2026-09-06",
      ]);
    }
  });
});

describe("assignClassPlacement", () => {
  const classIds = ["e1", "e2", "e3"];

  it("assigns a place and swaps when another dog holds it", () => {
    const swapped = assignClassPlacement(
      { e1: 1, e2: 2 },
      "e3",
      1,
      classIds,
    );
    expect(swapped.e3).toBe(1);
    expect(swapped.e1).toBe("");
    expect(swapped.e2).toBe(2);
  });

  it("clears a place when the same button is tapped again", () => {
    const cleared = assignClassPlacement({ e1: 2 }, "e1", 2, classIds);
    expect(cleared.e1).toBe("");
  });

  it("swaps two dogs when both already have places", () => {
    const swapped = assignClassPlacement(
      { e1: 1, e2: 3 },
      "e1",
      3,
      classIds,
    );
    expect(swapped.e1).toBe(3);
    expect(swapped.e2).toBe(1);
  });
});

function testEntry(
  overrides: Partial<RosterEntryRecord> & Pick<RosterEntryRecord, "id">,
): RosterEntryRecord {
  return {
    show_id: "s1",
    armband: "101",
    dog_name: "Rex",
    zb_number: "ADRK-1",
    wt: "2024-06-12",
    owner: "Owner",
    sex: "R",
    class_id: "jugendklasse-i",
    email: "",
    event_kind: "conformation",
    competition_day: "2026-09-05",
    catalog_class: "youth-i",
    ...overrides,
  };
}

describe("resolveFormwertInputs", () => {
  it("rejects unknown entries and invalid codes", () => {
    const entries = [testEntry({ id: "sat" })];
    expect(
      resolveFormwertInputs([{ entry_id: "missing", formwert: "V" }], entries, "s1")
        .valid,
    ).toBe(false);
    expect(
      resolveFormwertInputs(
        [{ entry_id: "sat", formwert: "nope" as never }],
        entries,
        "s1",
      ).valid,
    ).toBe(false);
  });

  it("accepts a valid rating or a clear", () => {
    const entries = [testEntry({ id: "sat" })];
    expect(
      resolveFormwertInputs([{ entry_id: "sat", formwert: "V" }], entries, "s1"),
    ).toEqual({ valid: true, rows: [{ entry_id: "sat", formwert: "V" }] });
    expect(
      resolveFormwertInputs([{ entry_id: "sat", formwert: null }], entries, "s1")
        .valid,
    ).toBe(true);
  });
});

describe("dirtyFormwertEntryIds", () => {
  it("lists entries whose rating changed", () => {
    expect(
      dirtyFormwertEntryIds({ a: "V", b: "Sg" }, { a: "V", b: null }, ["a", "b"]),
    ).toEqual(["b"]);
  });
});

describe("applyFormwertUpdates", () => {
  it("creates an SE form and review draft for a conformation-only dog", () => {
    const sat = testEntry({ id: "sat" });
    const next = applyFormwertUpdates({
      showId: "s1",
      entries: [sat],
      evaluations: [],
      critiques: [],
      show: { date: "2026-09-05", judge: "Sandra Reck" },
      rows: [{ entry_id: "sat", formwert: "V" }],
      newEvaluationId: () => "se-1",
      newCritiqueId: () => "c-1",
      now: "2026-09-05T12:00:00.000Z",
    });
    expect(next.evaluations).toHaveLength(1);
    expect(next.evaluations[0]?.form.formwert).toBe("V");
    expect(next.evaluations[0]?.form.dog_name).toBe("Rex");
    expect(next.evaluations[0]?.form.judge).toBe("Sandra Reck");
    expect(next.critiques).toHaveLength(1);
    expect(next.critiques[0]?.draft.formwert).toBe("V");
    expect(next.critiques[0]?.entry_id).toBe("sat");
  });

  it("writes the rating onto Friday SE and an existing Saturday critique", () => {
    const se = testEntry({
      id: "se",
      event_kind: "se",
      catalog_class: "standard-evaluation",
      competition_day: "2026-09-04",
      dog_id: "rex",
    });
    const sat = testEntry({ id: "sat", dog_id: "rex" });
    const existingSe: SeEvaluationRecord = {
      id: "eval-se",
      show_id: "s1",
      entry_id: "se",
      form: { ...createEmptyTnrkSeForm(), dog_name: "Rex", comments: "Steady" },
      status: "draft",
      created_at: "2026-09-04T10:00:00.000Z",
      updated_at: "2026-09-04T10:00:00.000Z",
    };
    const existingCritique: CritiqueRecord = {
      id: "c-sat",
      show_id: "s1",
      entry_id: "sat",
      status: "PENDING_REVIEW",
      transcript: "Spoken letter",
      draft: {
        narrative: "Spoken letter",
        formwert: "Sg",
        placement: null,
        titles: [],
      },
      delivery_status: "pending",
      created_at: "2026-09-05T11:00:00.000Z",
      updated_at: "2026-09-05T11:00:00.000Z",
    };
    const next = applyFormwertUpdates({
      showId: "s1",
      entries: [se, sat],
      evaluations: [existingSe],
      critiques: [existingCritique],
      rows: [{ entry_id: "sat", formwert: "V" }],
      newEvaluationId: () => "se-sat",
      newCritiqueId: () => "c-new",
      now: "2026-09-05T12:00:00.000Z",
    });
    expect(
      next.evaluations.find((evaluation) => evaluation.entry_id === "se")?.form
        .formwert,
    ).toBe("V");
    expect(
      next.evaluations.find((evaluation) => evaluation.entry_id === "se")?.form
        .comments,
    ).toBe("Steady");
    expect(
      next.evaluations.find((evaluation) => evaluation.entry_id === "sat")?.form
        .formwert,
    ).toBe("V");
    expect(
      next.critiques.find((critique) => critique.entry_id === "sat")?.draft
        .formwert,
    ).toBe("V");
  });

  it("does not overwrite an approved certificate", () => {
    const sat = testEntry({ id: "sat" });
    const approved: CritiqueRecord = {
      id: "c-sat",
      show_id: "s1",
      entry_id: "sat",
      status: "APPROVED",
      transcript: "Spoken letter",
      draft: {
        narrative: "Spoken letter",
        formwert: "Sg",
        placement: 1,
        titles: [],
      },
      delivery_status: "pending",
      created_at: "2026-09-05T11:00:00.000Z",
      updated_at: "2026-09-05T11:00:00.000Z",
      approved_at: "2026-09-05T11:30:00.000Z",
    };
    const next = applyFormwertUpdates({
      showId: "s1",
      entries: [sat],
      evaluations: [],
      critiques: [approved],
      rows: [{ entry_id: "sat", formwert: "V" }],
      newEvaluationId: () => "se-1",
      newCritiqueId: () => "c-1",
      now: "2026-09-05T12:00:00.000Z",
    });
    expect(next.evaluations[0]?.form.formwert).toBe("V");
    expect(next.critiques[0]?.draft.formwert).toBe("Sg");
    expect(next.critiques[0]?.status).toBe("APPROVED");
  });

  it("clears the rating on the SE form and open critique", () => {
    const sat = testEntry({ id: "sat" });
    const evaluation: SeEvaluationRecord = {
      id: "eval-sat",
      show_id: "s1",
      entry_id: "sat",
      form: { ...createEmptyTnrkSeForm(), formwert: "V" },
      status: "draft",
      created_at: "2026-09-05T11:00:00.000Z",
      updated_at: "2026-09-05T11:00:00.000Z",
    };
    const critique: CritiqueRecord = {
      id: "c-sat",
      show_id: "s1",
      entry_id: "sat",
      status: "PENDING_REVIEW",
      transcript: "Ringside SE form",
      draft: {
        narrative: "",
        formwert: "V",
        placement: null,
        titles: [],
      },
      delivery_status: "pending",
      created_at: "2026-09-05T11:00:00.000Z",
      updated_at: "2026-09-05T11:00:00.000Z",
    };
    const next = applyFormwertUpdates({
      showId: "s1",
      entries: [sat],
      evaluations: [evaluation],
      critiques: [critique],
      rows: [{ entry_id: "sat", formwert: null }],
      newEvaluationId: () => "se-x",
      newCritiqueId: () => "c-x",
      now: "2026-09-05T12:00:00.000Z",
    });
    expect(next.evaluations[0]?.form.formwert).toBeNull();
    expect(next.critiques[0]?.draft.formwert).toBeNull();
  });
});
