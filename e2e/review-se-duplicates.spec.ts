import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

test.describe("review queue SE clones", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("one weekend dog produces one review row after SE save", async ({
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
    await page.getByLabel("Show name").fill("E2E Review Dedupe");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-rev-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "301,Rex Weekend,DE-WK-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,se,2026-09-04,standard-evaluation,dog-rex-wk",
        "301,Rex Weekend,DE-WK-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,conformation,2026-09-05,youth-i,dog-rex-wk",
        "301,Rex Weekend,DE-WK-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,conformation,2026-09-06,youth-i,dog-rex-wk",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Rex Weekend", exact: true }).first(),
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
    const se = entryData.entries.find(
      (item) => item.dog_name === "Rex Weekend" && item.event_kind === "se",
    );
    expect(se).toBeTruthy();

    await page.goto(`/ringside/se/${se!.id}`);
    await expect(
      page.getByRole("heading", { name: "Rex Weekend" }),
    ).toBeVisible();
    await page.getByLabel("Comments").fill("Weekend SE notes");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();

    await page.goto("/admin/review");
    await expect(page.getByText("Needs attention (1)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Rex Weekend/ }),
    ).toHaveCount(1);

    const critiquesRes = await page.request.get(
      `/api/critiques?show_id=${showData.active_show_id}`,
    );
    const critiquesData = (await critiquesRes.json()) as {
      critiques: { entry_id: string }[];
    };
    expect(critiquesData.critiques).toHaveLength(1);
    expect(critiquesData.critiques[0]?.entry_id).toBe(se!.id);
  });
});
