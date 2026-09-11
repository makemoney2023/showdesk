import { describe, expect, it } from "vitest";
import { DEFAULT_DEMO_ORG, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/org";
import { EMPTY_STORE, type Show } from "@/lib/types";
import { mergeOrgStore, scopeStoreToOrg } from "./org-scope";

const blacksageShow: Show = {
  id: "show-bs",
  org_id: DEFAULT_DEMO_ORG_ID,
  name: "Blacksage Sieger",
  date: "2026-09-05",
  venue: "Home",
  judge: "Jane",
  rulebook: "adrk",
  created_at: "2026-01-01T00:00:00.000Z",
};

const otherShow: Show = {
  id: "show-tnrk",
  org_id: "org-tnrk",
  name: "TNRK Nationals",
  date: "2026-10-01",
  venue: "Away",
  judge: "Pat",
  rulebook: "adrk",
  created_at: "2026-01-02T00:00:00.000Z",
};

describe("scopeStoreToOrg", () => {
  it("keeps only the active club's shows and children", () => {
    const store = {
      ...EMPTY_STORE,
      shows: [blacksageShow, otherShow],
      entries: [
        {
          id: "e1",
          show_id: "show-bs",
          armband: "1",
          dog_name: "Rex",
          zb_number: "1",
          wt: "",
          owner: "A",
          sex: "R" as const,
          class_id: "zwischenklasse" as const,
          email: "a@b.co",
        },
        {
          id: "e2",
          show_id: "show-tnrk",
          armband: "2",
          dog_name: "Bella",
          zb_number: "2",
          wt: "",
          owner: "B",
          sex: "H" as const,
          class_id: "zwischenklasse" as const,
          email: "b@b.co",
        },
      ],
      active_show_id: "show-tnrk",
      organizations: [
        DEFAULT_DEMO_ORG,
        { id: "org-tnrk", name: "TNRK", slug: "tnrk" },
      ],
    };

    const scoped = scopeStoreToOrg(store, DEFAULT_DEMO_ORG_ID);
    expect(scoped.shows.map((show) => show.id)).toEqual(["show-bs"]);
    expect(scoped.entries.map((entry) => entry.id)).toEqual(["e1"]);
    expect(scoped.active_show_id).toBeNull();
    expect(scoped.organizations).toEqual([DEFAULT_DEMO_ORG]);
  });

  it("leaves a legacy unscoped store intact", () => {
    const store = {
      ...EMPTY_STORE,
      shows: [{ ...blacksageShow, org_id: undefined }],
      active_show_id: "show-bs",
    };
    const scoped = scopeStoreToOrg(store, DEFAULT_DEMO_ORG_ID);
    expect(scoped.shows).toHaveLength(1);
    expect(scoped.active_show_id).toBe("show-bs");
  });
});

describe("mergeOrgStore", () => {
  it("writes one club back without dropping the other", () => {
    const full = {
      ...EMPTY_STORE,
      shows: [blacksageShow, otherShow],
      entries: [
        {
          id: "e1",
          show_id: "show-bs",
          armband: "1",
          dog_name: "Rex",
          zb_number: "1",
          wt: "",
          owner: "A",
          sex: "R" as const,
          class_id: "zwischenklasse" as const,
          email: "a@b.co",
        },
      ],
    };
    const scoped = scopeStoreToOrg(full, DEFAULT_DEMO_ORG_ID);
    const next = {
      ...scoped,
      shows: [{ ...blacksageShow, name: "Renamed" }],
    };
    const merged = mergeOrgStore(full, next, DEFAULT_DEMO_ORG_ID);
    expect(merged.shows.find((show) => show.id === "show-tnrk")).toEqual(
      otherShow,
    );
    expect(merged.shows.find((show) => show.id === "show-bs")?.name).toBe(
      "Renamed",
    );
  });
});
