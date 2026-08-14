import type { AdrkClassId } from "./adrk-template";
import type { RosterEntryRecord } from "@/lib/types";

/** Blank entry profile for the create form (id empty until saved). */
export function blankRosterEntryDraft(
  showId: string,
  nextArmband: string,
): RosterEntryRecord {
  return {
    id: "",
    show_id: showId,
    armband: nextArmband,
    dog_name: "",
    zb_number: "",
    wt: "",
    owner: "",
    sex: "R",
    class_id: "zwischenklasse" as AdrkClassId,
    email: "",
  };
}
