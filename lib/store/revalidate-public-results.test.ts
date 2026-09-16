import { afterEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { resetPublicResultsStoreCache } from "./public-results";
import { revalidatePublishedResults } from "./revalidate-public-results";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./public-results", async () => {
  const actual = await vi.importActual<typeof import("./public-results")>(
    "./public-results",
  );
  return {
    ...actual,
    resetPublicResultsStoreCache: vi.fn(),
  };
});

describe("revalidatePublishedResults", () => {
  afterEach(() => {
    vi.mocked(revalidatePath).mockClear();
    vi.mocked(resetPublicResultsStoreCache).mockClear();
  });

  it("clears the live snapshot and the results ISR tree", () => {
    revalidatePublishedResults({
      name: "TNRK Sieger Show 2026",
      date: "2026-09-04",
    });
    expect(resetPublicResultsStoreCache).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/results", "layout");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/results/tnrk-sieger-show-2026-2026-09-04",
      "layout",
    );
  });

  it("still busts the index when the show is missing", () => {
    revalidatePublishedResults(null);
    expect(resetPublicResultsStoreCache).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/results", "layout");
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });
});
