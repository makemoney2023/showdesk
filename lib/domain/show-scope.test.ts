import { describe, expect, it } from "vitest";
import {
  assertShowScope,
  filterByShow,
  requireShowId,
  withShowId,
} from "./show-scope";

describe("show-scope", () => {
  const items = [
    { show_id: "show-a", id: "1" },
    { show_id: "show-b", id: "2" },
    { show_id: "show-a", id: "3" },
  ];

  it("filters by show_id", () => {
    expect(filterByShow(items, "show-a")).toHaveLength(2);
    expect(filterByShow(items, "show-b")).toHaveLength(1);
  });

  it("asserts show scope", () => {
    expect(() => assertShowScope(items[0], "show-a")).not.toThrow();
    expect(() => assertShowScope(items[1], "show-a")).toThrow(/Cross-show/);
  });

  it("adds show_id to objects", () => {
    expect(withShowId({ name: "Rex" }, "show-a")).toEqual({
      name: "Rex",
      show_id: "show-a",
    });
  });

  it("requires show_id", () => {
    expect(requireShowId("show-a")).toBe("show-a");
    expect(() => requireShowId("")).toThrow();
  });
});
