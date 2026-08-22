import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

test.describe("happy path", () => {
  test("login → csv modal → entry → mock critique → review", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.getByRole("button", { name: "New show" }).click();
    await page.getByLabel("Show name").fill("E2E Sieger Show");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.locator("#show_judge-1").fill("Second Judge");
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(page.getByRole("heading", { name: "Import roster CSV" })).toBeVisible();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-e2e-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      "armband,dog_name,zb_number,wt,owner,sex,class_id,email\n101,Rex Happy Path,DE-1,2024-01-01,Max Mustermann,R,zwischenklasse,owner@example.com\n",
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("heading", { name: "Import roster CSV" }),
    ).toBeHidden();
    await expect(
      page.getByRole("cell", { name: "Rex Happy Path", exact: true }),
    ).toBeVisible();

    await page.goto("/ringside");
    await page.getByLabel("Judge").selectOption("Test Judge");
    await expect(page.getByText("Rex Happy Path")).toBeVisible();
    await page.getByLabel("Search dogs").fill("does-not-match");
    await expect(page.getByText(/No dogs match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByText("Rex Happy Path")).toBeVisible();

    // Create a mock critique via API (cookie from login)
    const showRes = await page.request.get("/api/shows");
    const showData = (await showRes.json()) as {
      active_show_id: string;
    };
    const entryRes = await page.request.get(
      `/api/entries?show_id=${showData.active_show_id}`,
    );
    const entryData = (await entryRes.json()) as {
      entries: { id: string; dog_name: string }[];
    };
    const entry = entryData.entries.find((e) => e.dog_name === "Rex Happy Path");
    expect(entry).toBeTruthy();

    await page.goto(`/ringside/se/${entry!.id}`);
    await page.getByLabel("Comments").fill("Recovered ringside note");
    await page.waitForTimeout(500);
    await expect(page.getByText("Saved on this device")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Comments")).toHaveValue(
      "Recovered ringside note",
    );
    await expect(page.getByText(/Recovered unsaved changes/)).toBeVisible();

    const critRes = await page.request.post("/api/critiques", {
      data: {
        show_id: showData.active_show_id,
        entry_id: entry!.id,
        audio_base64: Buffer.from("fake-audio").toString("base64"),
      },
    });
    expect(critRes.ok()).toBeTruthy();

    await page.goto("/admin/review");
    await page.getByLabel("Search review queue").fill("does-not-match");
    await expect(page.getByText(/No review items match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.getByRole("button", { name: /Rex Happy Path/ }).click();
    await expect(page.getByLabel("Narrative (draft)")).toBeVisible();
    await page.getByRole("button", { name: "Approve & release" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/Approved/i)).toBeVisible({ timeout: 10000 });

    await page.goto("/admin/reports");
    await page.getByLabel("Search reports").fill("does-not-match");
    await expect(page.getByText(/No dogs match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(
      page.getByRole("heading", { name: /Rex Happy Path/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Select all approved" }).click();
    await expect(
      page.getByRole("link", { name: "Print selected certificates" }),
    ).toBeVisible();
    await page.getByRole("heading", { name: /Rex Happy Path/ }).click();
    await expect(
      page.getByRole("link", { name: "Print TNRK critique PDF" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Print SE PDF" }),
    ).toHaveCount(0);
  });
});
