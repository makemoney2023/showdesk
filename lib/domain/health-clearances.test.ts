import { describe, expect, it } from "vitest";
import {
  formatHealthClearances,
  normalizeHealthClearances,
} from "./health-clearances";

describe("health clearances", () => {
  it("formats the SE-required clearances onto one line", () => {
    expect(
      formatHealthClearances(
        normalizeHealthClearances({
          hd: "clear",
          ed: "clear",
          eye: "clear",
          heart: "clear",
          registry: "OFA",
          registry_status: "passing",
          jlpp: "N/N",
          nad: "N/N",
        }),
      ),
    ).toBe(
      "HD: clear; ED: clear; Eye: clear; Heart: clear; OFA passing; JLPP: N/N; NAD: N/N",
    );
  });
});
