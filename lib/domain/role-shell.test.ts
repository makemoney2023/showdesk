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

  it("lists exactly five secretary tabs and no ringside links", () => {
    const items = secretaryNavItems();
    expect(items.map((i) => i.label)).toEqual([
      "Desk",
      "Roster",
      "Review",
      "Reports",
      "Settings",
    ]);
    expect(items.some((i) => i.href.startsWith("/ringside"))).toBe(false);
    expect(items.some((i) => i.href === "/login")).toBe(false);
  });

  it("lists steward primary destinations without admin links", () => {
    const items = stewardNavItems();
    expect(items.map((i) => i.label)).toEqual(["Dogs", "Placements"]);
    expect(items.some((i) => i.href.startsWith("/admin"))).toBe(false);
  });
});
