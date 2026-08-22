import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { hasDeepgramKey } from "@/lib/deepgram/client";
import { buildTnrkCritiquePdf } from "@/lib/pdf/tnrk-critique-pdf";
import { pdfContainsText } from "@/lib/pdf/pdf-text";
import { processCritique } from "./process-critique";

const FIXTURE = path.join(
  process.cwd(),
  "e2e/fixtures/cobalt-brindle-critique.wav",
);

const SPOKEN_MARKERS = ["cobalt", "brindle", "withers", "croup"];

describe("Deepgram batch STT to TNRK critique PDF", () => {
  it.skipIf(!hasDeepgramKey())(
    "transcribes ringside audio and prints it on the certificate",
    async () => {
      const audioBase64 = readFileSync(FIXTURE).toString("base64");
      const result = await processCritique({
        audioBase64,
        entryId: "entry-deepgram",
        showId: "show-deepgram",
      });

      expect(result.mock).toBe(false);
      expect(result.source).toBe("batch");
      const spoken = result.transcript.toLowerCase();
      for (const marker of SPOKEN_MARKERS) {
        expect(spoken, `transcript missing “${marker}”`).toContain(marker);
      }
      expect(result.draft.narrative.toLowerCase()).toContain("cobalt");
      expect(result.draft.formwert).toBe("Sg");

      const pdf = await buildTnrkCritiquePdf({
        dog_name: "Cobalt Brindle",
        dob: "2024-03-01",
        armband: "222",
        narrative: result.draft.narrative,
        class_and_rating: `Youth I — ${result.draft.formwert}`,
        date: "2026-08-22",
        owner: "Show Desk",
        co_owner: "",
        judge_signature: "Test Judge",
      });
      expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
      expect(pdfContainsText(pdf, result.draft.narrative)).toBe(true);
      expect(pdfContainsText(pdf, "Cobalt Brindle")).toBe(true);
    },
    45_000,
  );
});
