import { expect, test, type Page } from "@playwright/test";
import { enableVirtualAuthenticator } from "./helpers/passkey";

const RECIPIENT_ONE = "0x1234567890AbcdEF1234567890aBcdef12345678";
const RECIPIENT_TWO = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const MOCK_USER_ADDRESS = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";
const AUTH_BASE_URL = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace("127.0.0.1", "localhost");
const RUN_DASHBOARD_SCENARIOS = process.env.E2E_ENABLE_DASHBOARD_AUTH === "1";

async function navigateToDashboardWithMockWallet(page: Page, userAddress: string) {
  await page.addInitScript((address) => {
    window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
    window.localStorage.setItem("tempo.walletCreated", "1");
    window.localStorage.setItem("tempo.lastAddress", address);
  }, userAddress);

  await page.goto(`${AUTH_BASE_URL}/app`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /Wallet Dashboard/i })).toBeVisible();
}

test.describe("Batch Transfer", () => {
  test.beforeEach(async ({ page }) => {
    await enableVirtualAuthenticator(page);
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("batch send supports multi-recipient review flow on authenticated dashboard", async ({ page }) => {
    test.skip(!RUN_DASHBOARD_SCENARIOS, "Requires passkey auth to successfully reach /app dashboard.");

    await navigateToDashboardWithMockWallet(page, MOCK_USER_ADDRESS);

    await page.getByRole("button", { name: "Batch Send" }).click();

    const recipientInputs = page.locator('input[id^="batch-recipient-"]');
    const amountInputs = page.locator('input[id^="batch-amount-"]');
    const memoInputs = page.locator('input[id^="batch-memo-"]');

    await expect(recipientInputs).toHaveCount(1);
    await recipientInputs.first().fill(RECIPIENT_ONE);
    await amountInputs.first().fill("1");
    await memoInputs.first().fill("Invoice-1");

    await page.getByRole("button", { name: "Add Recipient" }).click();
    await expect(recipientInputs).toHaveCount(2);

    await recipientInputs.nth(1).fill(RECIPIENT_TWO);
    await amountInputs.nth(1).fill("2");
    await memoInputs.nth(1).fill("Invoice-2");

    await expect(page.getByText("2 recipients")).toBeVisible();
    await expect(page.getByText(/Total:\s*3(\.0+)? pathUSD/)).toBeVisible();

    await page.getByRole("button", { name: "Review Batch" }).click();
    await expect(page.getByText("Confirm Batch Send", { exact: true })).toBeVisible();
    await expect(page.getByText("Recipient 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Recipient 2", { exact: true })).toBeVisible();
    await expect(page.getByText("Total: 3 pathUSD")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("button", { name: "Review Batch" })).toBeVisible();
    await expect(recipientInputs).toHaveCount(2);
    await expect(amountInputs.first()).toHaveValue("1");
    await expect(amountInputs.nth(1)).toHaveValue("2");
  });
});
