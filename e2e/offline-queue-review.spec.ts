import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

test.describe("offline queue review", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("Back to review reopens a queued SE draft for editing", async ({
    page,
  }) => {
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
    await page.getByLabel("Show name").fill("E2E Offline Queue Review");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-queue-review-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "301,Rex Queue Review,DE-QR-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,se,2026-09-04,standard-evaluation,dog-rex-qr",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Rex Queue Review", exact: true }).first(),
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
      (item) =>
        item.dog_name === "Rex Queue Review" && item.event_kind === "se",
    );
    expect(rex).toBeTruthy();

    await page.goto(`/ringside/se/${rex!.id}`);
    await expect(
      page.getByRole("heading", { name: "Rex Queue Review" }),
    ).toBeVisible();
    await page.getByLabel("Comments").fill("Queued for review edit");
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/saved to sync queue/i)).toBeVisible();

    await page.context().setOffline(false);
    await page.goto("/ringside");
    await page.getByRole("button", { name: "Queue" }).click();
    await expect(
      page.getByRole("heading", { name: "Offline queue" }),
    ).toBeVisible();
    await expect(page.getByText("#301 Rex Queue Review")).toBeVisible();
    await page.getByRole("link", { name: /Back to review/ }).click();
    await expect(page).toHaveURL(new RegExp(`/ringside/se/${rex!.id}`));
    await expect(
      page.getByRole("heading", { name: "Rex Queue Review" }),
    ).toBeVisible();
    await expect(page.getByLabel("Comments")).toHaveValue(
      "Queued for review edit",
    );

    await page.getByLabel("Comments").fill("Edited after Back to review");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Comments")).toHaveValue(
      "Edited after Back to review",
    );
  });
});
