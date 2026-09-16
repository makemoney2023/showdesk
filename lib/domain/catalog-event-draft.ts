import type { RosterEntryRecord } from "@/lib/types";
import { adrkClassForCatalog } from "./dog-identity";
import { resolvedConformationClass } from "./class-eligibility";
import type { ShowWeekend } from "./show-weekend";

export type EntryDaysState = {
  se: boolean;
  saturday: boolean;
  sunday: boolean;
};

/** Map stacked SE / conformation checkboxes onto the create-profile draft. */
export function applyCreateCatalogDraft(
  draft: RosterEntryRecord,
  days: EntryDaysState,
  weekend: ShowWeekend,
): RosterEntryRecord {
  const conformation = days.saturday || days.sunday;
  if (conformation) {
    const onDate = days.saturday ? weekend.saturday : weekend.sunday;
    const catalogClass =
      resolvedConformationClass({
        current: draft.catalog_class,
        dateOfBirth: draft.date_of_birth || draft.wt,
        onDate,
        prefixTitles: draft.prefix_titles,
        suffixTitles: draft.suffix_titles,
      }) ??
      (draft.catalog_class && draft.catalog_class !== "standard-evaluation"
        ? draft.catalog_class
        : "open");
    return {
      ...draft,
      event_kind: "conformation",
      catalog_class: catalogClass,
      class_id: adrkClassForCatalog(catalogClass),
      competition_day: onDate,
    };
  }
  if (days.se) {
    return {
      ...draft,
      event_kind: "se",
      catalog_class: "standard-evaluation",
      competition_day: weekend.se,
    };
  }
  return draft;
}

export function withResolvedConformationClass(
  draft: RosterEntryRecord,
  onDate: string,
): RosterEntryRecord {
  if (draft.event_kind === "se") return draft;
  const catalogClass = resolvedConformationClass({
    current: draft.catalog_class,
    dateOfBirth: draft.date_of_birth || draft.wt,
    onDate,
    prefixTitles: draft.prefix_titles,
    suffixTitles: draft.suffix_titles,
  });
  if (!catalogClass) return draft;
  return {
    ...draft,
    catalog_class: catalogClass,
    class_id: adrkClassForCatalog(catalogClass),
  };
}
