import { describe, expect, it } from "vitest";
import {
  dogDocumentRelativePath,
  isOwnedDogDocumentPath,
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

  it("accepts a PDF magic header", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 leftover");
    expect(sniffDogDocumentMime(bytes)).toBe("application/pdf");
    expect(validateDogDocumentUpload({ bytes }).valid).toBe(true);
  });
});
