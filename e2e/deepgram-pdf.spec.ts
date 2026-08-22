import { test, expect } from "@playwright/test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

const FIXTURE = path.join(
  process.cwd(),
  "e2e/fixtures/cobalt-brindle-critique.wav",
);

test.describe("Deepgram critique PDF", () => {
  test.skip(
    !process.env.DEEPGRAM_API_KEY?.trim(),
    "DEEPGRAM_API_KEY is required for live STT",
  );

  test("transcribes spoken critique and fills the TNRK PDF", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.getByRole("button", { name: "New show" }).click();
    await page.getByLabel("Show name").fill("Deepgram PDF Show");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-dg-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      "armband,dog_name,zb_number,wt,owner,sex,class_id,email\n222,Cobalt Brindle,DE-22,2024-03-01,Show Desk,R,zwischenklasse,owner@example.com\n",
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Cobalt Brindle", exact: true }),
    ).toBeVisible();

    const showRes = await page.request.get("/api/shows");
    const showData = (await showRes.json()) as { active_show_id: string };
    const entryRes = await page.request.get(
      `/api/entries?show_id=${showData.active_show_id}`,
    );
    const entryData = (await entryRes.json()) as {
      entries: { id: string; dog_name: string }[];
    };
    const entry = entryData.entries.find((e) => e.dog_name === "Cobalt Brindle");
    expect(entry).toBeTruthy();

    const audioBase64 = readFileSync(FIXTURE).toString("base64");
    const critRes = await page.request.post("/api/critiques", {
      data: {
        show_id: showData.active_show_id,
        entry_id: entry!.id,
        audio_base64: audioBase64,
        judge: "Test Judge",
      },
    });
    expect(critRes.ok()).toBeTruthy();
    const created = (await critRes.json()) as {
      id: string;
      mock: boolean;
      source: string;
    };
    expect(created.mock).toBe(false);
    expect(created.source).toBe("batch");

    const listRes = await page.request.get(
      `/api/critiques?show_id=${showData.active_show_id}`,
    );
    const listData = (await listRes.json()) as {
      critiques: {
        id: string;
        transcript: string;
        draft: { narrative: string; formwert: string | null };
      }[];
    };
    const critique = listData.critiques.find((c) => c.id === created.id);
    expect(critique).toBeTruthy();
    const spoken = critique!.transcript.toLowerCase();
    expect(spoken).toContain("cobalt");
    expect(spoken).toContain("brindle");
    expect(critique!.draft.narrative.toLowerCase()).toContain("cobalt");

    const approve = await page.request.patch("/api/critiques", {
      data: {
        show_id: showData.active_show_id,
        critique_id: created.id,
        action: "approve",
      },
    });
    expect(approve.ok()).toBeTruthy();

    const pdfRes = await page.request.get(
      `/api/pdf/tnrk?kind=critique&show_id=${showData.active_show_id}&critique_id=${created.id}`,
    );
    expect(pdfRes.ok()).toBeTruthy();
    expect(pdfRes.headers()["content-type"]).toContain("pdf");
    const pdf = Buffer.from(await pdfRes.body());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const raw = pdf.toString("latin1").toLowerCase();
    expect(raw).toContain("cobalt");
    expect(raw).toContain("brindle");
  });
});
