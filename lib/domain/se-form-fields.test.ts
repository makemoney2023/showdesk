import { describe, expect, it } from "vitest";
import { seFieldId, seFieldSlug, seRadioName } from "./se-form-fields";

describe("se-form-fields", () => {
  it("slugs labels for ids", () => {
    expect(seFieldSlug("HD/ED JLPP Nr")).toBe("hd-ed-jlpp-nr");
    expect(seFieldSlug("Dog's name")).toBe("dog-s-name");
  });

  it("scopes field ids and radio names to the entry", () => {
    expect(seFieldId("entry-a", "Comments")).toBe("se-entry-a-field-comments");
    expect(seFieldId("entry-b", "Comments")).not.toBe(
      seFieldId("entry-a", "Comments"),
    );
    expect(seRadioName("entry-a", "sex")).toBe("se-entry-a-sex");
    expect(seRadioName("entry-b", "final")).not.toBe(
      seRadioName("entry-a", "final"),
    );
  });
});
