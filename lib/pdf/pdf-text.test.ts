import { describe, expect, it } from "vitest";
import { buildTnrkCritiquePdf } from "./tnrk-critique-pdf";
import { pdfContainsText } from "./pdf-text";

describe("pdfContainsText", () => {
  it("finds narrative drawn onto the TNRK critique certificate", async () => {
    const bytes = await buildTnrkCritiquePdf({
      dog_name: "Marker Dog",
      dob: "2024-01-01",
      armband: "222",
      narrative: "Cobalt brindle male with firm withers.",
      class_and_rating: "Youth I — Sg",
      date: "2026-08-22",
      owner: "Owner",
      co_owner: "",
      judge_signature: "Judge",
    });
    expect(pdfContainsText(bytes, "Cobalt brindle")).toBe(true);
    expect(pdfContainsText(bytes, "firm withers")).toBe(true);
    expect(pdfContainsText(bytes, "not in this certificate")).toBe(false);
  });
});
