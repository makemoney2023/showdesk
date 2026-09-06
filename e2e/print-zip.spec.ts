import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { samplePublishedStore } from "../lib/domain/public-results.sample";
import { createEmptyTnrkSeForm } from "../lib/domain/tnrk-se-form";
import { EMPTY_STORE } from "../lib/types";

const TINY_PDF = Buffer.from("%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function seedPrintableShow() {
  const sample = samplePublishedStore();
  const store = {
    ...sample,
    demo_users: EMPTY_STORE.demo_users,
    active_show_id: "sample-show",
    se_evaluations: [
      {
        id: "sample-se-rex",
        show_id: "sample-show",
        entry_id: "sample-rex",
        status: "complete" as const,
        created_at: "2026-09-04T13:00:00.000Z",
        updated_at: "2026-09-04T13:30:00.000Z",
        form: {
          ...createEmptyTnrkSeForm(),
          dog_name: "Rex vom Blacksage",
        },
      },
    ],
  };
  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "store.json"), JSON.stringify(store, null, 2));
}

test("Reports downloads a print-shop ZIP of individual PDFs", async ({
  page,
}) => {
  await seedPrintableShow();
  await page.route("**/api/pdf/tnrk**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: TINY_PDF,
    });
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("secretary@demo.local");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/entries/);

  await page.goto("/admin/reports");
  const zipButton = page.getByRole("button", { name: "Download ZIP for printer" });
  await expect(zipButton).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    zipButton.click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    "tnrk-rcc-national-sieger-show-print-pdfs.zip",
  );

  const downloadPath = path.join(process.cwd(), ".data", "print-zip-e2e.zip");
  await download.saveAs(downloadPath);
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await readFile(downloadPath));
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  expect(names).toEqual(
    expect.arrayContaining([
      "certificates/101-rex-vom-blacksage-critique.pdf",
      "certificates/147-axel-vom-nordwald-critique.pdf",
      "certificates/212-bella-von-ostsee-critique.pdf",
      "se-forms/101-rex-vom-blacksage-se.pdf",
      "awards/101-rex-vom-blacksage-award.pdf",
      "awards/147-axel-vom-nordwald-award.pdf",
      "awards/212-bella-von-ostsee-award.pdf",
    ]),
  );
  expect(names).toHaveLength(7);
});
