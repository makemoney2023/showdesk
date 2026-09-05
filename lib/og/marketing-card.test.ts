import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { marketingOgSize } from "./marketing-og";

describe("marketing Open Graph image", () => {
  it("ships a stable 1200×630 PNG at /og.png", () => {
    const bytes = readFileSync(path.join(process.cwd(), "public/og.png"));
    expect(bytes.subarray(0, 8).toString("binary")).toBe(
      "\x89PNG\r\n\x1a\n",
    );
    expect(bytes.readUInt32BE(16)).toBe(marketingOgSize.width);
    expect(bytes.readUInt32BE(20)).toBe(marketingOgSize.height);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
  });
});
