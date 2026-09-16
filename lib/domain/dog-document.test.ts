import { describe, expect, it } from "vitest";
import {
  dogDocumentRelativePath,
  documentsIncludeHealthPdf,
  filenameForSeDocumentKind,
  inferSeDocumentKind,
  isOwnedDogDocumentPath,
  seDocumentRequirementError,
  sniffDogDocumentMime,
  validateDogDocumentUpload,
} from "./dog-document";

describe("dog documents", () => {
  it("keeps objects under the show/dog folder", () => {
    const path = dogDocumentRelativePath("show-1", "dog-1", "doc-1", "pdf");
    expect(path).toBe("show-1/docs/dog-1/doc-1.pdf");
    expect(isOwnedDogDocumentPath(path, "show-1", "dog-1", "doc-1")).toBe(true);
    expect(
      isOwnedDogDocumentPath("../other.pdf", "show-1", "dog-1", "doc-1"),
    ).toBe(false);
  });

  it("requires labeled HD, ED, and JLPP documents for SE", () => {
    expect(seDocumentRequirementError({ filenames: ["hips.jpg"] })).toBe(
      "Attach documents for ED, JLPP",
    );
    expect(
      seDocumentRequirementError({
        filenames: ["clearances.pdf"],
        contentTypes: ["application/pdf"],
      }),
    ).toBe("Attach documents for HD, ED, and JLPP");
    expect(
      seDocumentRequirementError({
        kinds: ["hd", "ed", "jlpp"],
      }),
    ).toBeNull();
    expect(
      seDocumentRequirementError({
        filenames: ["HD-hips.pdf", "ED-elbows.pdf", "JLPP-dna.pdf"],
      }),
    ).toBeNull();
    expect(inferSeDocumentKind("HD-scan.pdf")).toBe("hd");
    expect(inferSeDocumentKind("elbows.png")).toBe("ed");
    expect(filenameForSeDocumentKind("hips.pdf", "hd", "pdf")).toBe(
      "HD-hips.pdf",
    );
    expect(
      documentsIncludeHealthPdf(
        [
          {
            show_id: "show-1",
            dog_id: "dog-1",
            content_type: "application/pdf",
          },
        ],
        "show-1",
        "dog-1",
      ),
    ).toBe(true);
  });

  it("accepts a PDF magic header", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 leftover");
    expect(sniffDogDocumentMime(bytes)).toBe("application/pdf");
    expect(validateDogDocumentUpload({ bytes }).valid).toBe(true);
  });
});
