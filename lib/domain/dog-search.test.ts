import { describe, expect, it } from "vitest";
import { dogRecordMatchesSearch } from "./dog-search";

describe("dogRecordMatchesSearch", () => {
  const entry = {
    dog_name: "Rex Happy Path",
    armband: "101",
    owner: "Max Mustermann",
  };

  it("matches armband, dog name, and owner", () => {
    expect(dogRecordMatchesSearch("rex", entry)).toBe(true);
    expect(dogRecordMatchesSearch("101", entry)).toBe(true);
    expect(dogRecordMatchesSearch("mustermann", entry)).toBe(true);
    expect(dogRecordMatchesSearch("  REX  ", entry)).toBe(true);
  });

  it("keeps every dog when the query is empty", () => {
    expect(dogRecordMatchesSearch("", entry)).toBe(true);
    expect(dogRecordMatchesSearch("   ", entry)).toBe(true);
  });

  it("rejects dogs that do not match", () => {
    expect(dogRecordMatchesSearch("bella", entry)).toBe(false);
    expect(dogRecordMatchesSearch("999", entry)).toBe(false);
  });
});
