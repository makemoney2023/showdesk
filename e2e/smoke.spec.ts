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
    await expect(page.getByRole("img", { name: "Rex vom Blacksage" })).toBeVisible();
    await expect(page.getByText("V1", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Correct medium size, strong and typey head/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Share results" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Facebook" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Documents" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Critique certificate/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Award certificate/ }),
    ).toBeVisible();
    const pdfRes = await page.request.get(
      "/api/public/pdf?kind=critique&show_id=sample-show&critique_id=sample-crit-rex",
    );
    expect(pdfRes.ok()).toBeTruthy();
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");
    expect((await pdfRes.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Show Desk login" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("club-branded login loads for the demo club", async ({ page }) => {
    await page.goto("/c/blacksage/login");
    await expect(
      page.getByRole("heading", { name: "Blacksage Kennels login" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("signed-in settings shows this club and its login link", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("secretary@demo.local");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/entries/);

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Club" })).toBeVisible();
    await expect(page.getByText("Blacksage Kennels has its own Show Desk")).toBeVisible();
    await expect(page.getByText(/\/c\/blacksage\/login/)).toBeVisible();
    await expect(page.getByLabel("Staff invite code")).toHaveValue(
      "BLACKSAGE-DEMO",
    );
  });
});
