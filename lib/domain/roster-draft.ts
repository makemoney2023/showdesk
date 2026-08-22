import type { AdrkClassId } from "./adrk-template";
import type { RosterEntryRecord } from "@/lib/types";

/** Blank entry profile for the create form (id empty until saved). */
export function blankRosterEntryDraft(
  showId: string,
  nextArmband: string,
  competitionDay = "",
): RosterEntryRecord {
  return {
    id: "",
    show_id: showId,
    armband: nextArmband,
    dog_name: "",
    zb_number: "",
    wt: "",
    owner: "",
    // Deliberately blank at runtime so a new profile cannot silently default male.
    sex: "" as RosterEntryRecord["sex"],
    class_id: "zwischenklasse" as AdrkClassId,
    event_kind: "conformation",
    competition_day: competitionDay,
    catalog_class: "youth-i",
    email: "",
  };
}
