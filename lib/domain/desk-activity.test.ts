import { describe, expect, it } from "vitest";
import { recentDeskActivity } from "./desk-activity";

describe("recentDeskActivity", () => {
  it("returns the newest critiques first with roster titles", () => {
    expect(
      recentDeskActivity(
        [
          {
            id: "old",
            entry_id: "e1",
            status: "APPROVED",
            updated_at: "2026-08-20T10:00:00.000Z",
          },
          {
            id: "new",
            entry_id: "e2",
            status: "PENDING_REVIEW",
            updated_at: "2026-08-21T10:00:00.000Z",
          },
        ],
        [
          { id: "e1", dog_name: "Rex", armband: "101" },
          { id: "e2", dog_name: "Bella", armband: "102" },
        ],
        5,
      ),
    ).toEqual([
      {
        id: "new",
        title: "#102 Bella",
        subtitle: "Pending review",
        href: "/admin/review",
      },
      {
        id: "old",
        title: "#101 Rex",
        subtitle: "Approved",
        href: "/admin/review",
      },
    ]);
  });
});
