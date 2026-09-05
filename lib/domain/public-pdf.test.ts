import { describe, expect, it } from "vitest";
import { createEmptyTnrkSeForm } from "./tnrk-se-form";
import {
  canPublishSePdf,
  parsePublicPdfRequest,
  publicAwardPdfHref,
  publicCritiquePdfHref,
  publicSePdfHref,
} from "./public-pdf";

describe("public PDF hrefs", () => {
  it("builds query strings for each official document", () => {
    expect(publicCritiquePdfHref("show-1", "crit-9")).toBe(
      "/api/public/pdf?kind=critique&show_id=show-1&critique_id=crit-9",
    );
    expect(publicSePdfHref("show-1", "se-3")).toBe(
      "/api/public/pdf?kind=se&show_id=show-1&evaluation_id=se-3",
    );
    expect(publicAwardPdfHref("show-1", "entry-2")).toBe(
      "/api/public/pdf?kind=award&show_id=show-1&entry_id=entry-2",
    );
  });
});

describe("parsePublicPdfRequest", () => {
  it("requires show_id and the id for that kind", () => {
    expect(
      parsePublicPdfRequest({
        kind: "critique",
        showId: null,
        critiqueId: "c",
        evaluationId: null,
        entryId: null,
      }),
    ).toEqual({ error: "show_id required" });
    expect(
      parsePublicPdfRequest({
        kind: "se",
        showId: "s",
        critiqueId: null,
        evaluationId: null,
        entryId: null,
      }),
    ).toEqual({ error: "evaluation_id required" });
    expect(
      parsePublicPdfRequest({
        kind: "bundle",
        showId: "s",
        critiqueId: null,
        evaluationId: null,
        entryId: null,
      }),
    ).toEqual({ error: "kind must be critique, se, or award" });
  });
});

describe("canPublishSePdf", () => {
  it("publishes complete forms and filled drafts that already have a result", () => {
    const filled = createEmptyTnrkSeForm();
    filled.overall_appearance = "Strong male of correct type.";
    filled.final_result = "pass";
    expect(canPublishSePdf({ status: "complete", form: filled })).toBe(true);
    expect(canPublishSePdf({ status: "draft", form: filled })).toBe(true);
    expect(
      canPublishSePdf({ status: "draft", form: createEmptyTnrkSeForm() }),
    ).toBe(false);
    expect(canPublishSePdf(null)).toBe(false);
  });
});
