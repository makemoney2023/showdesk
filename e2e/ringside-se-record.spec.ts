import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

test.describe("ringside SE tile", () => {
  test("shows record critique for voice transcription on SE dogs", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.getByRole("button", { name: "New show" }).click();
    await page.getByLabel("Show name").fill("E2E SE Tile Show");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-e2e-se-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class\n201,SE Voice Dog,DE-3,2024-03-01,SE Owner,R,zwischenklasse,se@example.com,se,,standard-evaluation\n",
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "SE Voice Dog", exact: true }),
    ).toBeVisible();

    await page.goto("/ringside");
    await page.getByLabel("Judge").selectOption("Test Judge");
    await expect(page.getByText("SE Voice Dog")).toBeVisible();
    const recordLink = page.getByRole("link", {
      name: "Record critique for SE Voice Dog",
    });
    await expect(recordLink).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open SE form for SE Voice Dog" }),
    ).toBeVisible();
    await recordLink.click();
    await expect(page).toHaveURL(/\/ringside\/record\//);
    await expect(
      page.getByRole("heading", { name: "Record critique" }),
    ).toBeVisible();
  });
});
