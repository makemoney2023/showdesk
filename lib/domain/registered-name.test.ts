import { describe, expect, it } from "vitest";
import {
  formatTitlesLine,
  normalizeRegisteredName,
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
});
