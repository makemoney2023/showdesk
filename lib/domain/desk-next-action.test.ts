import { describe, expect, it } from "vitest";
import { deskNextAction } from "./desk-next-action";

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
