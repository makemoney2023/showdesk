import { describe, expect, it } from "vitest";
import {
  TNRK_CRITIQUE_FIELD_TOP,
  TNRK_CRITIQUE_FIELD_X,
  buildTnrkCritiquePdf,
  resolveCritiqueCertificateNarrative,
} from "./tnrk-critique-pdf";

describe("resolveCritiqueCertificateNarrative", () => {
  it("prefers editable draft narrative", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: " Edited narrative ",
        transcript: "Raw STT",
        seNarrative: "SE text",
      }),
    ).toBe("Edited narrative");
  });

  it("falls back to transcript when draft narrative is empty", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "  ",
        transcript: "Live STT body",
        seNarrative: "SE text",
      }),
    ).toBe("Live STT body");
  });

  it("falls back to SE narrative last", () => {
    expect(
      resolveCritiqueCertificateNarrative({
        draftNarrative: "",
        transcript: "",
        seNarrative: "From SE form",
      }),
    ).toBe("From SE form");
  });
});

describe("tnrk-critique-pdf layout", () => {
  it("places fill-ins below label bands (not on CRITIQUE title)", () => {
    expect(TNRK_CRITIQUE_FIELD_TOP.dog_name).toBeGreaterThan(200);
    expect(TNRK_CRITIQUE_FIELD_TOP.narrative_start).toBeGreaterThan(
      TNRK_CRITIQUE_FIELD_TOP.dog_name,
    );
    expect(TNRK_CRITIQUE_FIELD_TOP.class_and_rating).toBeGreaterThan(440);
    expect(TNRK_CRITIQUE_FIELD_X.dog_name).toBeGreaterThan(184);
    expect(TNRK_CRITIQUE_FIELD_X.dob).toBeGreaterThan(648);
  });

  it("builds a PDF with bold dog title and transcript body", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Rex Happy Path",
      dob: "2024-01-01",
      armband: "101",
      narrative: "Strong male. Moves freely. Vorzüglicher Rüde.",
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
