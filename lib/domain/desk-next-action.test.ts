import { describe, expect, it } from "vitest";
import { deskNextAction, deskSecondaryActions } from "./desk-next-action";

describe("deskNextAction", () => {
  it("asks to create a show when none exists", () => {
    expect(
      deskNextAction({ hasShow: false, entryCount: 0, pendingCount: 0 }),
    ).toEqual({ href: "/admin/entries", label: "Create show" });
  });

  it("asks to import roster when the show is empty", () => {
    expect(
      deskNextAction({ hasShow: true, entryCount: 0, pendingCount: 0 }),
    ).toEqual({ href: "/admin/entries", label: "Import roster" });
  });

  it("sends the secretary to review when drafts are waiting", () => {
    expect(
      deskNextAction({ hasShow: true, entryCount: 12, pendingCount: 3 }),
    ).toEqual({ href: "/admin/review", label: "Review 3 pending" });
  });

  it("opens ringside when the desk is otherwise clear", () => {
    expect(
      deskNextAction({ hasShow: true, entryCount: 12, pendingCount: 0 }),
    ).toEqual({ href: "/ringside", label: "Open ringside" });
  });
});

describe("deskSecondaryActions", () => {
  it("hides secondaries when there is no show", () => {
    expect(
      deskSecondaryActions({ hasShow: false, entryCount: 0, pendingCount: 0 }),
    ).toEqual([]);
  });

  it("offers add entry after import when the roster is empty", () => {
    expect(
      deskSecondaryActions({ hasShow: true, entryCount: 0, pendingCount: 0 }),
    ).toEqual([{ href: "/admin/entries", label: "Add entry" }]);
  });

  it("offers ringside when review is the primary", () => {
    expect(
      deskSecondaryActions({ hasShow: true, entryCount: 12, pendingCount: 3 }),
    ).toEqual([{ href: "/ringside", label: "Open ringside" }]);
  });

  it("offers import csv when the desk is otherwise clear", () => {
    expect(
      deskSecondaryActions({ hasShow: true, entryCount: 12, pendingCount: 0 }),
    ).toEqual([{ href: "/admin/entries", label: "Import CSV" }]);
  });
});
