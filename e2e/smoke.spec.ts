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

  test("public results archive is indexable without login", async ({ page }) => {
    await page.goto("/results");
    await expect(
      page.getByRole("heading", { name: "Sieger show results" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /TNRK \/ RCC National Sieger Show/ }),
    ).toBeVisible();

    await page.goto("/results/tnrk-rcc-national-sieger-show-2026-09-04");
    await expect(
      page.getByRole("heading", { name: /TNRK \/ RCC National Sieger Show results/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Rex vom Blacksage/ })).toBeVisible();
    await expect(page.getByText("What does V1 mean?")).toBeVisible();

    await page.goto(
      "/results/tnrk-rcc-national-sieger-show-2026-09-04/101-rex-vom-blacksage",
    );
    await expect(
      page.getByRole("heading", { name: "Rex vom Blacksage" }),
    ).toBeVisible();
    await expect(page.getByText("V1", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Share results" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Facebook" })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Show Desk login" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });
});
