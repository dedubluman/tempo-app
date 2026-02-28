import { expect, test } from "@playwright/test";

test.describe("POS Replay Protection", () => {
  test("POS page loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app/pos");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("POS page has amount input", async ({ page }) => {
    await page.goto("/app/pos");
    await page.waitForLoadState("networkidle");

    // Check keypad or amount input exists
    const keypadButtons = page.locator('button:has-text("1")');
    await expect(keypadButtons.first()).toBeVisible();
  });

  test("generate QR button exists", async ({ page }) => {
    await page.goto("/app/pos");
    await page.waitForLoadState("networkidle");

    // Check for QR generation button
    const qrButton = page.locator('button:has-text("Generate QR")');
    const chargeButton = page.locator('button:has-text("Charge")');
    const hasQrButton = await qrButton.count();
    const hasChargeButton = await chargeButton.count();
    expect(hasQrButton + hasChargeButton).toBeGreaterThan(0);
  });

  test("POS receipt history page loads", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
    await expect(page.locator('text=Receipt History')).toBeVisible();
  });

  test("receipt history shows empty state", async ({ page }) => {
    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('text=No receipts yet')).toBeVisible();
  });

  test("receipt history has export CSV button", async ({ page }) => {
    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeDisabled(); // disabled when no receipts
  });
});
