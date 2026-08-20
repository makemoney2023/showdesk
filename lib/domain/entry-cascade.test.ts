import { describe, expect, it } from "vitest";
import { EMPTY_STORE } from "@/lib/types";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  critiquesForEntry,
  removeEntryAndChildren,
} from "./entry-cascade";

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
