import { test, expect } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "fs";
import path from "path";
import os from "os";

/** Valid 1×1 PNG so the browser can decode it before we JPEG it. */
const TINY_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082",
  "hex",
);

test.describe("dog photo upload", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("ringside can upload a dog photo without a 413", async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      localStorage.setItem("sss-pwa-install-dismissed", String(Date.now()));
    });
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.getByRole("button", { name: "New show" }).click();
    await page.getByLabel("Show name").fill("E2E Dog Photo");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-photo-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "302,Rex Photo,DE-PH-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,se,2026-09-04,standard-evaluation,dog-rex-photo",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Rex Photo", exact: true }).first(),
    ).toBeVisible();

    const showRes = await page.request.get("/api/shows");
    const showData = (await showRes.json()) as { active_show_id: string };
    createdShowId = showData.active_show_id;
    const entryRes = await page.request.get(
      `/api/entries?show_id=${showData.active_show_id}`,
    );
    const entryData = (await entryRes.json()) as {
      entries: { id: string; dog_name: string; event_kind?: string }[];
    };
    const rex = entryData.entries.find(
      (item) => item.dog_name === "Rex Photo" && item.event_kind === "se",
    );
    expect(rex).toBeTruthy();

    await page.goto(`/ringside/se/${rex!.id}`);
    await expect(page.getByRole("heading", { name: "Rex Photo" })).toBeVisible();

    const upload = page.waitForResponse(
      (res) =>
        res.url().includes("/api/photos") &&
        res.request().method() === "POST",
    );
    await page.locator("#dog-photo").setInputFiles({
      name: "dog.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    const posted = await upload;
    expect(posted.status()).toBe(200);
    const payload = (await posted.json()) as { photo_path?: string };
    expect(payload.photo_path).toBeTruthy();
    await expect(page.getByText("Could not upload photo")).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Dog" })).toBeVisible();
  });
});
