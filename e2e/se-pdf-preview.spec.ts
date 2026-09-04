import { test, expect } from "@playwright/test";
import path from "path";
import { writeFileSync, mkdtempSync } from "fs";
import os from "os";
import { pdfContainsText } from "../lib/pdf/pdf-text";

test.describe("SE PDF preview", () => {
  let createdShowId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (!createdShowId) return;
    await page.request.post("/api/purge", {
      data: { show_id: createdShowId, confirm: "PURGE" },
    });
    createdShowId = null;
  });

  test("preview PDF includes measurements and critique from the SE form", async ({
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
    await page.getByLabel("Show name").fill("E2E SE PDF Preview");
    await page.getByLabel("Date").fill("2026-09-05");
    await page.getByLabel("Venue").fill("Demo Ground");
    await page.getByLabel("Judge", { exact: true }).fill("Test Judge");
    await page.getByRole("button", { name: "Add judge" }).click();
    await page.getByRole("button", { name: "Create show" }).click();
    await expect(page.getByText(/Show created/i)).toBeVisible();

    await page.goto("/admin/entries");
    await page.getByRole("button", { name: "Import CSV" }).click();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "sss-se-pdf-"));
    const csvPath = path.join(tmpDir, `roster-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      [
        "armband,dog_name,zb_number,wt,owner,sex,class_id,email,event_kind,competition_day,catalog_class,dog_id",
        "301,Rex Pdf,DE-PDF-1,2024-01-01,Max Mustermann,R,zwischenklasse,rex@example.com,se,2026-09-04,standard-evaluation,dog-rex-pdf",
      ].join("\n"),
    );
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: "Import file" }).click();
    await expect(
      page.getByRole("cell", { name: "Rex Pdf", exact: true }).first(),
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
      (item) => item.dog_name === "Rex Pdf" && item.event_kind === "se",
    );
    expect(rex).toBeTruthy();

    await page.goto(`/ringside/se/${rex!.id}`);
    await expect(page.getByRole("heading", { name: "Rex Pdf" })).toBeVisible();
    await page.getByLabel("Height / Widerrist").fill("62 cm");
    await page.getByLabel("Chest depth").fill("28 cm");
    await page.getByLabel("Weight").fill("42 kg");
    await page.getByLabel("Body length").fill("70 cm");
    await page.getByLabel("Chest circumference").fill("80 cm");
    await page.getByLabel("Eye color").fill("dark brown");
    await page.getByLabel("Muzzle length").fill("10 cm");
    await page.getByLabel("Skull").fill("15 cm");
    await page.getByLabel("Legible tattoo").fill("yes");
    await page
      .getByPlaceholder("Free-form evaluation notes…")
      .fill(
        "Strong male of excellent type with a powerful head and confident ring behavior.",
      );
    await page.getByLabel("Comments").fill("Very good temperament.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();

    const evalRes = await page.request.get(
      `/api/evaluations?show_id=${showData.active_show_id}&entry_id=${rex!.id}`,
    );
    const evalData = (await evalRes.json()) as {
      evaluations: { id: string; form: { measurements: { height: string } } }[];
    };
    const evaluation = evalData.evaluations[0];
    expect(evaluation?.form.measurements.height).toBe("62 cm");

    const preview = await page.request.get(
      `/api/pdf/tnrk?kind=se&show_id=${showData.active_show_id}&evaluation_id=${evaluation.id}&preview=1`,
    );
    expect(preview.ok()).toBeTruthy();
    expect(preview.headers()["cache-control"]).toMatch(/no-store/i);
    const bytes = new Uint8Array(await preview.body());
    expect(pdfContainsText(bytes, "62 cm")).toBe(true);
    expect(pdfContainsText(bytes, "42 kg")).toBe(true);
    expect(pdfContainsText(bytes, "powerful head")).toBe(true);
    expect(pdfContainsText(bytes, "Very good temperament")).toBe(true);

    const live = await page.request.post("/api/pdf/tnrk", {
      data: {
        kind: "se",
        show_id: showData.active_show_id,
        evaluation_id: evaluation.id,
        preview: true,
        form: {
          ...evaluation.form,
          measurements: {
            ...evaluation.form.measurements,
            height: "63 cm live",
          },
          overall_appearance: "Live critique on the unsaved form.",
        },
      },
    });
    expect(live.ok()).toBeTruthy();
    const liveBytes = new Uint8Array(await live.body());
    expect(pdfContainsText(liveBytes, "63 cm live")).toBe(true);
    expect(pdfContainsText(liveBytes, "Live critique on the unsaved form")).toBe(
      true,
    );

    const staleClient = await page.request.post("/api/pdf/tnrk", {
      data: {
        kind: "se",
        show_id: showData.active_show_id,
        evaluation_id: evaluation.id,
        preview: true,
        form: {
          dog_name: "Rex Pdf",
          measurements: {},
          overall_appearance: "",
        },
      },
    });
    expect(staleClient.ok()).toBeTruthy();
    const staleBytes = new Uint8Array(await staleClient.body());
    expect(pdfContainsText(staleBytes, "62 cm")).toBe(true);
    expect(pdfContainsText(staleBytes, "powerful head")).toBe(true);

    const previewRequest = page.context().waitForEvent("request", {
      predicate: (req) =>
        req.method() === "GET" &&
        req.url().includes("/api/pdf/tnrk") &&
        req.url().includes(`evaluation_id=${evaluation.id}`) &&
        req.url().includes("preview=1"),
    });
    await page.getByRole("button", { name: "Preview PDF" }).click();
    const previewReq = await previewRequest;
    expect(previewReq.url()).toContain("kind=se");
    expect(previewReq.url()).not.toContain("about:blank");
    const clicked = await page.request.get(previewReq.url());
    expect(clicked.ok()).toBeTruthy();
    const clickedBytes = new Uint8Array(await clicked.body());
    expect(pdfContainsText(clickedBytes, "62 cm")).toBe(true);
    expect(pdfContainsText(clickedBytes, "powerful head")).toBe(true);
  });
});
