import { test, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { samplePublishedStore } from "../lib/domain/public-results.sample";
import { EMPTY_STORE } from "../lib/types";

const storePath = path.join(process.cwd(), ".data", "store.json");


test("Reports filters by judge without changing saved critiques", async ({
  page,
}) => {
  const sample = samplePublishedStore();
  const store = {
    ...sample,
    demo_users: EMPTY_STORE.demo_users,
    active_show_id: "sample-show",
  };
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
  const before = store.critiques;

  await page.goto("/login");
  await page.getByLabel("Email").fill("secretary@demo.local");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/entries/);

  await page.goto("/admin/reports");
  await expect(
    page.getByRole("button", { name: "All judges (3)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "#101 Rex vom Blacksage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "#212 Bella von Ostsee" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Maria Makomaski (1)" }).click();
  await expect(
    page.getByRole("heading", { name: "#212 Bella von Ostsee" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "#101 Rex vom Blacksage" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "#147 Axel vom Nordwald" }),
  ).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Maria Makomaski" })).toBeVisible();

  await page.getByRole("button", { name: "All judges (3)" }).click();
  await expect(
    page.getByRole("heading", { name: "#101 Rex vom Blacksage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "#147 Axel vom Nordwald" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "#212 Bella von Ostsee" }),
  ).toBeVisible();

  const after = (
    JSON.parse(await readFile(storePath, "utf8")) as {
      critiques: typeof before;
    }
  ).critiques;
  expect(after).toEqual(before);
});
