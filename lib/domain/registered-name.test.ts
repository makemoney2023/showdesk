import { describe, expect, it } from "vitest";
import {
  formatTitlesLine,
  normalizeRegisteredName,
  registeredDogName,
  splitRegisteredName,
} from "./registered-name";

describe("registered name", () => {
  it("keeps a clean registered name untouched", () => {
    expect(
      splitRegisteredName({
        dog_name: "Rex vom Blacksage",
        prefix_titles: "",
        suffix_titles: "",
      }),
    ).toEqual({
      dog_name: "Rex vom Blacksage",
      prefix_titles: "",
      suffix_titles: "",
    });
  });

  it("moves prefix and suffix titles out of the name", () => {
    expect(
      splitRegisteredName({
        dog_name: "AM CH Rex vom Blacksage IGP1",
      }),
    ).toEqual({
      dog_name: "Rex vom Blacksage",
      prefix_titles: "AM CH",
      suffix_titles: "IGP1",
    });
  });

  it("does not duplicate titles already stored on the entry", () => {
    expect(
      splitRegisteredName({
        dog_name: "CH Calendar Girl IGP1",
        prefix_titles: "CH",
        suffix_titles: "IGP1",
      }),
    ).toEqual({
      dog_name: "Calendar Girl",
      prefix_titles: "CH",
      suffix_titles: "IGP1",
    });
  });

  it("does not strip a name that is only title tokens", () => {
    expect(splitRegisteredName({ dog_name: "CH IGP1" })).toEqual({
      dog_name: "CH IGP1",
      prefix_titles: "",
      suffix_titles: "",
    });
  });

  it("normalizes titled and untitled names for matching", () => {
    expect(normalizeRegisteredName("AM CH Calendar Girl IGP1")).toBe(
      "calendar girl",
    );
    expect(normalizeRegisteredName("Calendar Girl")).toBe("calendar girl");
    expect(normalizeRegisteredName("  Calendar   Girl  ")).toBe("calendar girl");
    expect(normalizeRegisteredName("")).toBe("");
  });

  it("formats prefix and suffix for roster display", () => {
    expect(
      formatTitlesLine({ prefix_titles: "AM CH", suffix_titles: "IGP1" }),
    ).toBe("AM CH IGP1");
    expect(formatTitlesLine({ prefix_titles: "", suffix_titles: "" })).toBe("");
  });

  it("strips compacted North American titles and qualifier suffixes", () => {
    expect(
      splitRegisteredName({
        dog_name:
          "CANCH GRCHB, AMCH Eiriens Calendar Girl CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
      }),
    ).toMatchObject({
      dog_name: "Eiriens Calendar Girl",
    });
  });

  it("strips a kennel phrase in front of Youth CH", () => {
    expect(
      splitRegisteredName({
        dog_name: "Urka Inc. Youth Ch. Ynes von der Wasserbödstädt",
      }),
    ).toMatchObject({
      dog_name: "Ynes von der Wasserbödstädt",
    });
  });

  it("strips a compacted kennel prefix that is repeated in front of the name", () => {
    expect(
      registeredDogName({
        dog_name:
          "URKA INC. YOUTHCH Urka Inc. Youth Ch. Ynes von der Wasserbödstädt",
      }),
    ).toBe("Ynes von der Wasserbödstädt");
  });

  it("returns the registered name for certificates", () => {
    expect(
      registeredDogName({
        dog_name:
          "CAN CH GRCHB, AM CH Eiriens Calendar Girl CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
        prefix_titles: "CAN CH GRCHB, AM CH",
        suffix_titles: "CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
      }),
    ).toBe("Eiriens Calendar Girl");
  });

  it("strips stored custom prefix and suffix even when they are not known titles", () => {
    expect(
      splitRegisteredName({
        dog_name:
          "Urka Inc. Youth Ch. Ynes von der Wasserbödstädt CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
        prefix_titles: "Urka Inc. Youth Ch.",
        suffix_titles: "CGN SDIN FDC ATT 2025 GRUETS QUALIFIER",
      }),
    ).toMatchObject({
      dog_name: "Ynes von der Wasserbödstädt",
    });
  });
});
