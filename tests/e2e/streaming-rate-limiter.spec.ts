import { expect, test } from "@playwright/test";

test.describe("Streaming Rate Limiter", () => {
  test("stream page loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("stream page has configure form", async ({ page }) => {
    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text=Streaming Payments')).toBeVisible();
    await expect(page.locator('text=Configure Stream')).toBeVisible();
  });

  test("stream page shows duration options", async ({ page }) => {
    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('button', { hasText: /^1 min$/ })).toBeVisible();
    await expect(page.locator('button', { hasText: /^5 min$/ })).toBeVisible();
    await expect(page.locator('button', { hasText: /^15 min$/ })).toBeVisible();
  });

  test("stream page shows sponsor limit info", async ({ page }) => {
    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text=Sponsor limit')).toBeVisible();
    await expect(page.locator('text=/\\d+\\/10 remaining/')).toBeVisible();
  });

  test("start stream button disabled without address", async ({ page }) => {
    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");

    const startBtn = page.locator('button:has-text("Start Stream")');
    await expect(startBtn).toBeDisabled();
  });
});
