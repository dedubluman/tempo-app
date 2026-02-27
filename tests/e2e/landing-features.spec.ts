import { expect, test } from "@playwright/test";

test.describe("Landing Page Feature Cards", () => {
  test("core features section renders 4 cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Everything you need")).toBeVisible();
    await expect(page.getByText("Instant Send")).toBeVisible();
    await expect(page.getByText("Easy Receive")).toBeVisible();
    await expect(page.getByText("Activity Feed")).toBeVisible();
    await expect(page.getByText("Session Keys")).toBeVisible();
  });

  test("advanced features section renders 8 cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("#advanced-features").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Powered by Tempo" })).toBeVisible();
    await expect(page.getByText("Stablecoin Swap")).toBeVisible();
    await expect(page.getByText("Payment Requests")).toBeVisible();
    await expect(page.getByText("Token Forge")).toBeVisible();
    await expect(page.getByText("Scheduled Payments")).toBeVisible();
    await expect(page.getByText("AI Agent Wallet")).toBeVisible();
    await expect(page.getByText("Multi-Token Portfolio")).toBeVisible();
    await expect(page.getByText("QR POS Terminal")).toBeVisible();
    await expect(page.getByText("Streaming Payments")).toBeVisible();
  });
});
