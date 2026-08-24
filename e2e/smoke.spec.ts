import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home page shows the marketing page to anonymous visitors", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /The judge speaks/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What is Show Desk?" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Show Desk login" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
