import { describe, expect, it } from "vitest";
import { isCsvFile, readCsvFileText } from "./csv-file";

describe("csv-file", () => {
  it("accepts .csv names", () => {
    expect(isCsvFile(new File(["a"], "roster.csv", { type: "text/csv" }))).toBe(
      true,
    );
    expect(isCsvFile(new File(["a"], "dogs.xlsx", { type: "" }))).toBe(false);
  });

  it("reads file text", async () => {
    const file = new File(
      ["armband,dog_name\n101,Rex"],
      "roster.csv",
      { type: "text/csv" },
    );
    await expect(readCsvFileText(file)).resolves.toContain("Rex");
  });
});
