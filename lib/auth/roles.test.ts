import { describe, expect, it } from "vitest";
import { isSecretaryRole, parseDeskRole } from "./roles";

describe("parseDeskRole", () => {
  it("keeps an explicit steward claim", () => {
    expect(parseDeskRole("steward")).toBe("steward");
  });

  it("defaults missing or unknown claims to secretary", () => {
    expect(parseDeskRole(undefined)).toBe("secretary");
    expect(parseDeskRole("admin")).toBe("secretary");
    expect(parseDeskRole("secretary")).toBe("secretary");
  });
});

describe("isSecretaryRole", () => {
  it("is true only for secretary", () => {
    expect(isSecretaryRole("secretary")).toBe(true);
    expect(isSecretaryRole("steward")).toBe(false);
  });
});
