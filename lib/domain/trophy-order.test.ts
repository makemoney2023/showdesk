import { describe, expect, it } from "vitest";
import {
  buildTrophyOrder,
  trophyOrderCsv,
  trophyOrderPrintHtml,
} from "./trophy-order";
import type { RosterEntryRecord } from "@/lib/types";

function entry(
  overrides: Partial<RosterEntryRecord> &
    Pick<RosterEntryRecord, "id" | "armband" | "dog_name">,
): RosterEntryRecord {
  return {
    show_id: "show-1",
    zb_number: "",
    wt: "2024-01-01",
    owner: "Owner",
    email: "",
    sex: "R",
    class_id: "offene-klasse",
    event_kind: "conformation",
    competition_day: "2026-09-05",
    catalog_class: "open",
    ...overrides,
  };
}

describe("trophy order", () => {
  it("groups conformation by day, class, and sex, with SE first", () => {
    const groups = buildTrophyOrder([
      entry({
        id: "sun",
        armband: "80",
        dog_name: "Sunday Dog",
        competition_day: "2026-09-06",
        catalog_class: "working",
        class_id: "gebrauchshundklasse",
      }),
      entry({
        id: "open-h",
        armband: "12",
        dog_name: "Bella",
        sex: "H",
      }),
      entry({
        id: "open-r",
        armband: "4",
        dog_name: "Rex",
      }),
      entry({
        id: "se",
        armband: "4",
        dog_name: "Rex",
        event_kind: "se",
        competition_day: "2026-09-04",
        catalog_class: "standard-evaluation",
      }),
    ]);
    expect(groups.map((group) => group.kind)).toEqual([
      "se",
      "conformation",
      "conformation",
      "conformation",
    ]);
    expect(groups[0]?.count).toBe(1);
    expect(groups.find((group) => group.classLabel.includes("Open — Male"))?.dogs.map((dog) => dog.armband)).toEqual(["4"]);
    expect(
      groups.find((group) => group.catalogClass === "working")?.day,
    ).toBe("2026-09-06");
  });

  it("writes a vendor CSV with pool rows and dog rows", () => {
    const csv = trophyOrderCsv(
      buildTrophyOrder([
        entry({ id: "1", armband: "50", dog_name: "Rex vom Test" }),
      ]),
    );
    expect(csv).toContain("kind,day,day_label,class,class_label,sex,sex_label,entry_count,armband,dog_name,owner");
    expect(csv).toContain("conformation,2026-09-05");
    expect(csv).toContain("50,Rex vom Test,Owner");
  });

  it("prints a titled HTML sheet", () => {
    const html = trophyOrderPrintHtml({
      showName: "TNRK Sieger",
      displayDate: "September 5, 2026",
      groups: buildTrophyOrder([
        entry({ id: "1", armband: "50", dog_name: "Rex vom Test" }),
      ]),
    });
    expect(html).toContain("TNRK Sieger — trophy order");
    expect(html).toContain("#50");
    expect(html).toContain("Rex vom Test");
  });
});
