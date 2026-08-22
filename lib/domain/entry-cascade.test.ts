import { describe, expect, it } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  critiquesForEntry,
  newestCritiqueForEntry,
  openCritiqueForEntry,
  primaryCritiqueForEntry,
  removeEntryAndChildren,
} from "./entry-cascade";
import type { CritiqueRecord } from "@/lib/types";

const showId = "show-1";
const entryId = "entry-1";

function seededStore() {
  return {
    ...EMPTY_STORE,
    entries: [
      {
        id: entryId,
        show_id: showId,
        armband: "101",
        dog_name: "Rex",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R" as const,
        class_id: "zwischenklasse" as const,
        email: "a@b.c",
      },
      {
        id: "entry-2",
        show_id: showId,
        armband: "102",
        dog_name: "Other",
        zb_number: "",
        wt: "",
        owner: "Owner",
        sex: "R" as const,
        class_id: "zwischenklasse" as const,
        email: "",
      },
    ],
    critiques: [
      {
        id: "c1",
        show_id: showId,
        entry_id: entryId,
        status: "PENDING_REVIEW" as const,
        transcript: "x",
        draft: { narrative: "", formwert: null, placement: null, titles: [] },
        delivery_status: "blocked" as const,
        created_at: "t",
        updated_at: "t",
        audio_path: "show-1/c1.webm",
      },
    ],
    placements: [
      {
        id: "p1",
        show_id: showId,
        class_id: "zwischenklasse" as const,
        entry_id: entryId,
        placement: 1 as const,
      },
    ],
    se_evaluations: [
      {
        id: "se1",
        show_id: showId,
        entry_id: entryId,
        form: createEmptyTnrkSeForm(),
        status: "complete" as const,
        created_at: "t",
        updated_at: "t",
      },
    ],
  };
}

describe("removeEntryAndChildren", () => {
  it("removes the entry and all child rows for that dog", () => {
    const next = removeEntryAndChildren(seededStore(), entryId, showId);
    expect(next.entries.map((e) => e.id)).toEqual(["entry-2"]);
    expect(next.critiques).toHaveLength(0);
    expect(next.placements).toHaveLength(0);
    expect(next.se_evaluations).toHaveLength(0);
  });

  it("lists critiques that still have audio to delete", () => {
    const store = seededStore();
    expect(
      critiquesForEntry(store.critiques, entryId, showId).map((c) => c.audio_path),
    ).toEqual(["show-1/c1.webm"]);
  });
});

describe("critique selection for one dog", () => {
  function row(
    overrides: Partial<CritiqueRecord> & Pick<CritiqueRecord, "id" | "status">,
  ): CritiqueRecord {
    return {
      show_id: showId,
      entry_id: entryId,
      transcript: "",
      draft: { narrative: "", formwert: null, placement: null, titles: [] },
      delivery_status: "pending",
      created_at: "t",
      updated_at: "t",
      ...overrides,
    };
  }

  it("reuses the open SE stub instead of a later approved sibling", () => {
    const critiques = [
      row({ id: "old-se", status: "PENDING_REVIEW", updated_at: "1" }),
      row({ id: "approved", status: "APPROVED", updated_at: "2" }),
    ];
    expect(openCritiqueForEntry(critiques, entryId, showId)?.id).toBe("old-se");
    expect(primaryCritiqueForEntry(critiques, entryId, showId)?.id).toBe(
      "approved",
    );
  });

  it("prefers ERROR over PROCESSING when choosing a recording target", () => {
    const critiques = [
      row({ id: "proc", status: "PROCESSING" }),
      row({ id: "err", status: "ERROR" }),
    ];
    expect(openCritiqueForEntry(critiques, entryId, showId)?.id).toBe("err");
  });

  it("uses the newest critique when none are approved", () => {
    const critiques = [
      row({ id: "older", status: "PENDING_REVIEW", updated_at: "1" }),
      row({ id: "newer", status: "ERROR", updated_at: "3" }),
    ];
    expect(newestCritiqueForEntry(critiques, entryId, showId)?.id).toBe("newer");
    expect(primaryCritiqueForEntry(critiques, entryId, showId)?.id).toBe(
      "newer",
    );
  });
});
