import { describe, expect, it } from "vitest";
import { blankRosterEntryDraft } from "./roster-draft";
import {
  applyCreateCatalogDraft,
  withResolvedConformationClass,
} from "./catalog-event-draft";

const weekend = {
  se: "2026-09-04",
  saturday: "2026-09-05",
  sunday: "2026-09-06",
};

describe("applyCreateCatalogDraft", () => {
  it("leaves the draft alone until an event is checked", () => {
    const draft = blankRosterEntryDraft("show-1", "101", weekend.saturday);
    expect(
      applyCreateCatalogDraft(
        draft,
        { se: false, saturday: false, sunday: false },
        weekend,
      ),
    ).toEqual(draft);
  });

  it("maps Standard Evaluation onto Friday SE metadata", () => {
    const draft = applyCreateCatalogDraft(
      blankRosterEntryDraft("show-1", "101"),
      { se: true, saturday: false, sunday: false },
      weekend,
    );
    expect(draft.event_kind).toBe("se");
    expect(draft.catalog_class).toBe("standard-evaluation");
    expect(draft.competition_day).toBe("2026-09-04");
  });

  it("keeps conformation class for a two-year-old as Open, not puppy", () => {
    const draft = applyCreateCatalogDraft(
      {
        ...blankRosterEntryDraft("show-1", "101"),
        date_of_birth: "2024-09-05",
        sex: "H",
      },
      { se: true, saturday: true, sunday: false },
      weekend,
    );
    expect(draft.event_kind).toBe("conformation");
    expect(draft.catalog_class).toBe("open");
    expect(draft.class_id).toBe("offene-klasse");
    expect(draft.competition_day).toBe("2026-09-05");
  });
});

describe("withResolvedConformationClass", () => {
  it("does not rewrite an SE row", () => {
    const se = {
      ...blankRosterEntryDraft("show-1", "101"),
      event_kind: "se" as const,
      catalog_class: "standard-evaluation" as const,
    };
    expect(withResolvedConformationClass(se, weekend.saturday)).toEqual(se);
  });
});
