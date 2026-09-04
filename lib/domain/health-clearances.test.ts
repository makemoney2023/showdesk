import { describe, expect, it } from "vitest";
import {
  formatHealthClearances,
  healthClearanceRows,
  mergeHealthClearances,
  normalizeHealthClearances,
  seHealthRequirementError,
} from "./health-clearances";

const SAMPLE = {
  hd: "clear",
  ed: "clear",
  eye: "clear",
  heart: "clear",
  registry: "OFA" as const,
  registry_status: "passing",
  jlpp: "N/N",
  nad: "N/N",
};

describe("health clearances", () => {
  it("formats the SE-required clearances onto one line", () => {
    expect(formatHealthClearances(normalizeHealthClearances(SAMPLE))).toBe(
      "HD: clear; ED: clear; Eye: clear; Heart: clear; OFA passing; JLPP: N/N; NAD: N/N",
    );
  });

  it("omits empty fields from labeled rows", () => {
    expect(
      healthClearanceRows(normalizeHealthClearances({ hd: "A", jlpp: "N/N" })),
    ).toEqual([
      { label: "HD", value: "A" },
      { label: "JLPP", value: "N/N" },
    ]);
  });

  it("treats SE clearance fields as optional", () => {
    expect(seHealthRequirementError(SAMPLE)).toBeNull();
    expect(seHealthRequirementError({ hd: "clear" })).toBeNull();
    expect(seHealthRequirementError({})).toBeNull();
  });

  it("merges the first filled value for each clearance", () => {
    expect(
      mergeHealthClearances([
        { hd: "clear" },
        { hd: "fair", ed: "clear", registry: "ADRK" },
      ]),
    ).toEqual({
      hd: "clear",
      ed: "clear",
      eye: "",
      heart: "",
      registry: "ADRK",
      registry_status: "",
      jlpp: "",
      nad: "",
    });
  });
});
