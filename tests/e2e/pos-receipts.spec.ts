import { expect, test } from "@playwright/test";

test.describe("POS Merchant Receipts", () => {
  test("receipt history page renders correctly", async ({ page }) => {
    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('h1:has-text("Receipt History")')).toBeVisible();
    await expect(page.locator('text=Back to POS')).toBeVisible();
  });

  test("receipt history shows receipt count", async ({ page }) => {
    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    // Should show "0 receipts stored locally"
    await expect(page.locator('text=receipt')).toBeVisible();
  });

  test("injecting mock receipts renders table", async ({ page }) => {
    // Inject mock receipt into localStorage before navigation
    await page.goto("/app/pos/history");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      const mockData = {
        state: {
          receipts: [
            {
              id: "test-receipt-1",
              amount: "10.50",
              token: "pathUSD",
              tokenAddress: "0x20c0000000000000000000000000000000000000",
              sender: "0x1234567890abcdef1234567890abcdef12345678",
              txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
              timestamp: Date.now(),
              memo: "Test payment",
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem("fluxus-merchant-receipts", JSON.stringify(mockData));
    });

    // Reload to pick up the stored data
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should show the receipt
    await expect(page.locator('text=pathUSD')).toBeVisible();
    await expect(page.locator('text=10.50')).toBeVisible();
    await expect(page.locator('text=Test payment')).toBeVisible();
  });

  test("clear all button works", async ({ page }) => {
    // Inject data
    await page.goto("/app/pos/history");
    await page.evaluate(() => {
      const mockData = {
        state: {
          receipts: [
            {
              id: "test-receipt-2",
              amount: "5.00",
              token: "AlphaUSD",
              tokenAddress: "0x20c0000000000000000000000000000000000001",
              sender: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
              timestamp: Date.now(),
              memo: "",
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem("fluxus-merchant-receipts", JSON.stringify(mockData));
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Accept the confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    const clearBtn = page.locator('button:has-text("Clear All")');
    await clearBtn.click();

    // Should show empty state after clearing
    await expect(page.locator('text=No receipts yet')).toBeVisible();
  });
});
