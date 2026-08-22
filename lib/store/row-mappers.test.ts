import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "@/lib/domain/adrk-template";
import { createEmptyTnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type {
  CritiqueRecord,
  PlacementRecord,
  RosterEntryRecord,
  SeEvaluationRecord,
  Show,
} from "@/lib/types";
import {
  mapCritiqueRow,
  mapEntryRow,
  mapPlacementRow,
  mapSeEvaluationRow,
  mapShowRow,
  toCritiqueRow,
  toEntryRow,
  toPlacementRow,
  toSeEvaluationRow,
  toShowRow,
} from "./row-mappers";

const show: Show = {
  id: "show-1",
  name: "TNRK Spring Sieger",
  date: "2026-04-12",
  venue: "Harrisburg",
  judge: "Jane Doe",
  judges: ["Jane Doe", "John Roe"],
  rulebook: "adrk",
  logo_url: "/logos/tnrk.png",
  created_at: "2026-03-01T12:00:00.000Z",
};

const entry: RosterEntryRecord = {
  id: "entry-1",
  show_id: "show-1",
  armband: "12",
  dog_name: "Rex vom Haus",
  zb_number: "ADRK-123",
  wt: "2023-01-15",
  owner: "Pat Owner",
  sex: "R",
  class_id: "zwischenklasse",
  email: "pat@example.com",
};

const critique: CritiqueRecord = {
  id: "crit-1",
  show_id: "show-1",
  entry_id: "entry-1",
  status: "PENDING_REVIEW",
  transcript: "Strong head, correct bite.",
  draft: {
    ...createEmptyDraft(),
    narrative: "Strong head, correct bite.",
    formwert: "V",
    placement: 1,
    titles: ["BOB"],
    draftAssist: { head: "strong" },
  },
  audio_path: "show-1/crit-1.webm",
  delivery_status: "pending",
  error_message: undefined,
  created_at: "2026-04-12T14:00:00.000Z",
  updated_at: "2026-04-12T14:05:00.000Z",
  approved_at: undefined,
  judge: "Jane Doe",
};

const placement: PlacementRecord = {
  id: "place-1",
  show_id: "show-1",
  class_id: "zwischenklasse",
  sex: "R",
  entry_id: "entry-1",
  placement: 1,
};

const seEvaluation: SeEvaluationRecord = {
  id: "se-1",
  show_id: "show-1",
  entry_id: "entry-1",
  form: {
    ...createEmptyTnrkSeForm(),
    dog_name: "Rex vom Haus",
    judge: "Jane Doe",
    final_result: "pass",
  },
  status: "complete",
  created_at: "2026-04-12T13:00:00.000Z",
  updated_at: "2026-04-12T13:30:00.000Z",
};

describe("show row mappers", () => {
  it("round-trips judges jsonb with the rest of the show", () => {
    const mapped = mapShowRow(toShowRow(show));
    expect(mapped).toEqual(show);
    expect(mapped.judges).toEqual(["Jane Doe", "John Roe"]);
  });

  it("nulls missing logo_url and missing judges on the DB row", () => {
    const row = toShowRow({ ...show, logo_url: undefined, judges: undefined });
    expect(row.logo_url).toBeNull();
    expect(row.judges).toBeNull();
  });

  it("parses stringified judges jsonb from the driver", () => {
    const row = toShowRow(show);
    const mapped = mapShowRow({
      ...row,
      judges: JSON.stringify(show.judges),
    });
    expect(mapped.judges).toEqual(["Jane Doe", "John Roe"]);
  });
});

describe("entry row mappers", () => {
  it("round-trips roster entries", () => {
    expect(mapEntryRow(toEntryRow(entry))).toEqual(entry);
  });

  it("round-trips optional dog photo path", () => {
    const withPhoto = { ...entry, photo_path: "show-1/entry-1.jpg" };
    expect(mapEntryRow(toEntryRow(withPhoto))).toEqual(withPhoto);
    expect(toEntryRow(entry).photo_path).toBeNull();
  });
});

describe("critique row mappers", () => {
  it("round-trips jsonb draft and judge", () => {
    const mapped = mapCritiqueRow(toCritiqueRow(critique));
    expect(mapped).toEqual(critique);
    expect(mapped.draft).toEqual(critique.draft);
    expect(mapped.draft.narrative).toBe("Strong head, correct bite.");
    expect(mapped.draft.formwert).toBe("V");
    expect(mapped.judge).toBe("Jane Doe");
    expect(mapped.audio_path).toBe("show-1/crit-1.webm");
    expect(mapped.error_message).toBeUndefined();
    expect(mapped.approved_at).toBeUndefined();
  });

  it("nulls optional columns including missing judge", () => {
    const row = toCritiqueRow({ ...critique, judge: undefined });
    expect(row.judge).toBeNull();
    expect(row.error_message).toBeNull();
    expect(row.approved_at).toBeNull();
    expect(row.draft).toEqual(critique.draft);
  });

  it("parses stringified jsonb draft from the driver", () => {
    const row = toCritiqueRow(critique);
    const mapped = mapCritiqueRow({
      ...row,
      draft: JSON.stringify(critique.draft),
    });
    expect(mapped.draft).toEqual(critique.draft);
  });
});

describe("placement row mappers", () => {
  it("round-trips placements", () => {
    expect(mapPlacementRow(toPlacementRow(placement))).toEqual(placement);
  });
});

describe("se evaluation row mappers", () => {
  it("round-trips jsonb form", () => {
    const mapped = mapSeEvaluationRow(toSeEvaluationRow(seEvaluation));
    expect(mapped).toEqual(seEvaluation);
    expect(mapped.form.dog_name).toBe("Rex vom Haus");
    expect(mapped.form.final_result).toBe("pass");
    expect(mapped.form.measurements.height).toBe("");
  });

  it("parses stringified jsonb form from the driver", () => {
    const row = toSeEvaluationRow(seEvaluation);
    const mapped = mapSeEvaluationRow({
      ...row,
      form: JSON.stringify(seEvaluation.form),
    });
    expect(mapped.form).toEqual(seEvaluation.form);
  });
});
