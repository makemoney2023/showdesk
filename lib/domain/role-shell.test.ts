import { describe, expect, it } from "vitest";
import {
  secretaryNavItems,
  shellForPath,
  stewardNavItems,
} from "./role-shell";

describe("role-shell", () => {
  it("classifies pathnames", () => {
    expect(shellForPath("/login")).toBe("minimal");
    expect(shellForPath("/ringside")).toBe("steward");
    expect(shellForPath("/ringside/record/abc")).toBe("steward");
    expect(shellForPath("/")).toBe("secretary");
    expect(shellForPath("/admin/review")).toBe("secretary");
  });

  it("lists secretary tabs including Ringside for role switch", () => {
    const items = secretaryNavItems();
    expect(items.map((i) => i.label)).toEqual([
      "Desk",
      "Roster",
      "Review",
      "Reports",
      "Settings",
      "Ringside",
    ]);
    expect(items.find((i) => i.label === "Ringside")?.href).toBe("/ringside");
    expect(items.some((i) => i.href === "/login")).toBe(false);
  });

  it("lists steward destinations including Desk for role switch", () => {
    const items = stewardNavItems();
    expect(items.map((i) => i.label)).toEqual(["Dogs", "Placements", "Desk"]);
    expect(items.find((i) => i.label === "Desk")?.href).toBe("/");
    expect(items.some((i) => i.href.startsWith("/admin"))).toBe(false);
  });
});
