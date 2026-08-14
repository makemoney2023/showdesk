import { describe, expect, it } from "vitest";
import { deskLoadState } from "./desk-load-state";

describe("deskLoadState", () => {
  it("stays loading until the first response", () => {
    expect(
      deskLoadState({
        fetchFailed: false,
        activeShowId: null,
        loaded: false,
      }),
    ).toEqual({ kind: "loading" });
  });

  it("treats 401 as unauthorized, not an empty roster", () => {
    expect(
      deskLoadState({
        fetchFailed: true,
        status: 401,
        activeShowId: null,
        loaded: true,
      }),
    ).toEqual({ kind: "unauthorized" });
  });

  it("treats a loaded store with no active show as no-show", () => {
    expect(
      deskLoadState({
        fetchFailed: false,
        activeShowId: null,
        loaded: true,
      }),
    ).toEqual({ kind: "no-show" });
  });

  it("is ready only when a show id is present", () => {
    expect(
      deskLoadState({
        fetchFailed: false,
        activeShowId: "show-1",
        loaded: true,
      }),
    ).toEqual({ kind: "ready", showId: "show-1" });
  });
});
