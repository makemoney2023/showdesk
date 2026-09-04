import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";

test.describe("SE form isolation", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("typed SE fields stay on the dog they were entered for", async ({
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
    await page.getByLabel("Show name").fill("E2E SE Isolation");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-se-iso-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "201,Rex Isolation,DE-ISO-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,se,2026-09-04,standard-evaluation,dog-rex-iso",
        "202,Bella Isolation,DE-ISO-2,2024-02-01,Jane Example,H,zwischenklasse,bella@example.com,se,2026-09-04,standard-evaluation,dog-bella-iso",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Rex Isolation", exact: true }).first(),
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
      (item) => item.dog_name === "Rex Isolation" && item.event_kind === "se",
    );
    const bella = entryData.entries.find(
      (item) => item.dog_name === "Bella Isolation" && item.event_kind === "se",
    );
    expect(rex).toBeTruthy();
    expect(bella).toBeTruthy();

    await page.goto(`/ringside/se/${rex!.id}`);
    await expect(
      page.getByRole("heading", { name: "Rex Isolation" }),
    ).toBeVisible();
    await page.getByLabel("Comments").fill("Rex-only steward note");
    await page.getByLabel("Height / Widerrist").fill("64 cm");
    await page.getByLabel("Correct scissor bite").click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved")).toBeVisible();

    await page.goto(`/ringside/se/${bella!.id}`);
    await expect(
      page.getByRole("heading", { name: "Bella Isolation" }),
    ).toBeVisible();
    await expect(page.getByLabel("Comments")).toHaveValue("");
    await expect(page.getByLabel("Height / Widerrist")).toHaveValue("");
    await expect(page.getByLabel("Correct scissor bite")).not.toBeChecked();
    await expect(page.getByLabel("Dog's name")).toHaveValue("Bella Isolation");

    await page.goto(`/ringside/se/${rex!.id}`);
    await expect(
      page.getByRole("heading", { name: "Rex Isolation" }),
    ).toBeVisible();
    await expect(page.getByLabel("Comments")).toHaveValue(
      "Rex-only steward note",
    );
    await expect(page.getByLabel("Height / Widerrist")).toHaveValue("64 cm");
    await expect(page.getByLabel("Correct scissor bite")).toBeChecked();
  });
});
