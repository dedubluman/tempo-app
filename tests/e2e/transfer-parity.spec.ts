import { expect, test, type Page } from "@playwright/test";

const VALID_RECIPIENT = "0x1234567890AbcdEF1234567890aBcdef12345678";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const USER_ADDRESS = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

async function setupDashboard(page: Page) {
  await page.addInitScript((address) => {
    window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
    window.localStorage.setItem("tempo.walletCreated", "1");
    window.localStorage.setItem("tempo.lastAddress", address);
  }, USER_ADDRESS);
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
}

test.describe("TransferForm Parity (Golden Baseline)", () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboard(page);
  });

  test("validation: empty recipient shows error", async ({ page }) => {
    const sendButton = page.getByRole("button", { name: /^Send$/ });
    await sendButton.click();
    await expect(
      page.locator("text=Recipient address required")
    ).toBeVisible();
  });

  test("validation: invalid address format shows error", async ({ page }) => {
    const recipientInput = page.getByLabel("Recipient Address");
    await recipientInput.fill("not-an-address");
    await page.getByRole("button", { name: /^Send$/ }).click();
    await expect(page.locator("text=Invalid address format")).toBeVisible();
  });

  test("validation: zero address shows error", async ({ page }) => {
    const recipientInput = page.getByLabel("Recipient Address");
    await recipientInput.fill(ZERO_ADDRESS);
    await page.getByRole("button", { name: /^Send$/ }).click();
    await expect(
      page.locator("text=Cannot send to zero address")
    ).toBeVisible();
  });

  test("validation: zero amount shows error", async ({ page }) => {
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel(/Amount/i);
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("0");
    await page.getByRole("button", { name: /^Send$/ }).click();
    await expect(
      page.locator("text=/amount must be greater than/i")
    ).toBeVisible();
  });

  test("mode toggle: switching to batch shows batch UI", async ({ page }) => {
    const batchButton = page.getByRole("button", { name: /Batch/i });
    await batchButton.click();
    await expect(
      page.getByRole("button", { name: /Add Recipient/i })
    ).toBeVisible();
  });

  test("batch: add and remove row changes row count", async ({ page }) => {
    const batchButton = page.getByRole("button", { name: /Batch/i });
    await batchButton.click();

    const initialRows = page.locator('input[id^="batch-recipient-"]');
    await expect(initialRows).toHaveCount(1);

    await page.getByRole("button", { name: /Add Recipient/i }).click();
    await expect(initialRows).toHaveCount(2);

    const removeButtons = page.getByRole("button", { name: /Remove/i });
    await removeButtons.last().click();
    await expect(initialRows).toHaveCount(1);
  });

  test("batch: total display matches sum of row amounts", async ({ page }) => {
    const batchButton = page.getByRole("button", { name: /Batch/i });
    await batchButton.click();

    const amountInputs = page.locator('input[id^="batch-amount-"]');
    await amountInputs.first().fill("5");

    await page.getByRole("button", { name: /Add Recipient/i }).click();
    await amountInputs.nth(1).fill("3");

    await expect(page.locator("text=/Total:.*8/")).toBeVisible();
  });
});
