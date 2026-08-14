import { describe, expect, it } from "vitest";
import {
  TNRK_CRITIQUE_FIELD_TOP,
  TNRK_CRITIQUE_FIELD_X,
  buildTnrkCritiquePdf,
} from "./tnrk-critique-pdf";

describe("tnrk-critique-pdf layout", () => {
  it("places fill-ins below label bands (not on CRITIQUE title)", () => {
    // Title CRITIQUE / RICHTERBERICHT sits ~141–166 from top.
    expect(TNRK_CRITIQUE_FIELD_TOP.dog_name).toBeGreaterThan(200);
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeGreaterThan(
      TNRK_CRITIQUE_FIELD_TOP.dog_name,
    );
    expect(TNRK_CRITIQUE_FIELD_TOP.class_and_rating).toBeGreaterThan(440);
    // Dog value must start after "NAME DES HUNDES" label (~184).
    expect(TNRK_CRITIQUE_FIELD_X.dog_name).toBeGreaterThan(184);
    expect(TNRK_CRITIQUE_FIELD_X.dob).toBeGreaterThan(648);
  });

  it("builds a non-empty PDF from SE-synced narrative fields", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Rex Happy Path",
      dob: "2024-01-01",
      armband: "101",
      narrative: "Strong male. Moves freely.\n\nSE result: PASS.",
      class_and_rating: "Zwischenklasse — V",
      date: "2026-08-13",
      owner: "Max Mustermann",
      co_owner: "",
      judge_signature: "Test Judge",
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
