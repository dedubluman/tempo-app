import { expect, test, type Page } from "@playwright/test";

const VALID_RECIPIENT = "0x1234567890AbcdEF1234567890aBcdef12345678";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Mock wallet connection state by setting localStorage and simulating connected account
 */
async function mockWalletConnection(page: Page, userAddress: string) {
  await page.addInitScript((address) => {
    // Set wallet connection state
    window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
    window.localStorage.setItem("tempo.walletCreated", "1");
    window.localStorage.setItem("tempo.lastAddress", address);

    // Mock wagmi account state
    Object.defineProperty(window, "__WAGMI_ACCOUNT__", {
      value: { address, isConnected: true },
      writable: true,
    });
  }, userAddress);
}

/**
 * Navigate to /app with mocked wallet connection
 */
async function navigateToAppWithWallet(page: Page, userAddress: string) {
  await mockWalletConnection(page, userAddress);
  await page.goto("/app");
  // Wait for page to stabilize
  await page.waitForLoadState("networkidle");
}

test.describe("Transfer Form - Validation Flows", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  test("1. Form validation - Empty recipient", async ({ page }) => {
    // Arrange: Form is loaded with empty recipient
    const recipientInput = page.getByLabel("Recipient Address");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Leave recipient empty and click Send
    await recipientInput.focus();
    await recipientInput.blur();
    await sendButton.click();

    // Assert: Error message is visible
    const errorMessage = page.locator("text=Recipient address required");
    await expect(errorMessage).toBeVisible();
  });

  test("2. Form validation - Invalid address format", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter invalid address format
    await recipientInput.fill("not-an-address");
    await sendButton.click();

    // Assert: Invalid address error is shown
    const errorMessage = page.locator("text=Invalid address format");
    await expect(errorMessage).toBeVisible();
  });

  test("3. Form validation - Zero address", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter zero address
    await recipientInput.fill(ZERO_ADDRESS);
    await sendButton.click();

    // Assert: Zero address error is shown
    const errorMessage = page.locator("text=Cannot send to zero address");
    await expect(errorMessage).toBeVisible();
  });

  test("4. Form validation - Self-transfer prevention", async ({ page }) => {
    // Arrange: Form is loaded with user's own address
    const recipientInput = page.getByLabel("Recipient Address");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Try to send to own wallet address
    await recipientInput.fill(userAddress);
    await sendButton.click();

    // Assert: Self-transfer error is shown
    const errorMessage = page.locator("text=Cannot send to your own address");
    await expect(errorMessage).toBeVisible();
  });

  test("5. Form validation - Invalid amount (negative)", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter negative amount
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("-5");
    await sendButton.click();

    // Assert: Amount validation error is shown
    const errorMessage = page.locator("text=Amount must be greater than 0");
    await expect(errorMessage).toBeVisible();
  });

  test("5b. Form validation - Invalid amount (non-numeric)", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter non-numeric amount
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("abc");
    await sendButton.click();

    // Assert: Amount validation error is shown
    const errorMessage = page.locator("text=/Amount must be greater than 0|Invalid amount format/");
    await expect(errorMessage).toBeVisible();
  });

  test("6. Form validation - Too many decimals", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");

    // Act: Enter amount with 7 decimals (max is 6 for pathUSD)
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("1.1234567");

    // Assert: Input is truncated to 6 decimals
    const inputValue = await amountInput.inputValue();
    expect(inputValue).toBe("1.123456");
  });

  test("7. Form validation - Memo too long", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const memoInput = page.getByLabel("Memo (optional)");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter memo exceeding 32 bytes
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("10");
    // Create a string that exceeds 32 bytes (using emoji to ensure byte overflow)
    const longMemo = "This is a very long memo that exceeds 32 bytes limit";
    await memoInput.fill(longMemo);
    await sendButton.click();

    // Assert: Memo error is shown
    const errorMessage = page.locator("text=Memo exceeds 32 bytes");
    await expect(errorMessage).toBeVisible();
  });
});

test.describe("Transfer Form - Confirmation Step", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  test("8. Confirmation step - Review details", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const memoInput = page.getByLabel("Memo (optional)");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Fill valid form and click Send
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("10");
    await memoInput.fill("Test");
    await sendButton.click();

    // Assert: Confirmation screen is shown with correct details
    await expect(page.locator("text=Confirm Transfer")).toBeVisible();
    await expect(page.locator("text=Review required")).toBeVisible();

    // Verify recipient address is displayed
    const recipientDisplay = page.locator("text=Recipient").locator("..").locator("p:has-text('0x')");
    await expect(recipientDisplay).toContainText(VALID_RECIPIENT);

    // Verify amount is displayed
    const amountDisplay = page.locator("text=Amount").locator("..").locator("p:has-text('pathUSD')");
    await expect(amountDisplay).toContainText("10 pathUSD");

    // Verify memo is displayed
    const memoDisplay = page.locator("text=Memo").locator("..").locator("p");
    await expect(memoDisplay).toContainText("Test");

    // Verify buttons are present
    await expect(page.getByRole("button", { name: /Confirm & Send/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit/ })).toBeVisible();
  });

  test("9. Confirmation step - Edit returns to form", async ({ page }) => {
    // Arrange: Form is filled and confirmation screen is shown
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const memoInput = page.getByLabel("Memo (optional)");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("10");
    await memoInput.fill("Test");
    await sendButton.click();

    // Wait for confirmation screen
    await expect(page.locator("text=Confirm Transfer")).toBeVisible();

    // Act: Click Edit button
    const editButton = page.getByRole("button", { name: /Edit/ });
    await editButton.click();

    // Assert: Back to form with values preserved
    await expect(page.locator("text=Send pathUSD")).toBeVisible();
    await expect(recipientInput).toHaveValue(VALID_RECIPIENT);
    await expect(amountInput).toHaveValue("10");
    await expect(memoInput).toHaveValue("Test");
  });
});

test.describe("Transfer Form - Max Button", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  test("10. Max button functionality", async ({ page }) => {
    // Arrange: Form is loaded and balance is visible
    const amountInput = page.getByLabel("Amount");
    const maxButton = page.getByRole("button", { name: /Max/ });

    // Get the balance from the page (look for balance display)
    const balanceText = page.locator("text=/Balance|balance/i").first();
    await expect(balanceText).toBeVisible();

    // Act: Click Max button
    await maxButton.click();

    // Assert: Amount field is populated with a value
    const amountValue = await amountInput.inputValue();
    expect(amountValue).toBeTruthy();
    expect(amountValue).not.toBe("");

    // Verify it's a valid number
    const numValue = parseFloat(amountValue);
    expect(numValue).toBeGreaterThan(0);
  });
});

test.describe("Transfer Form - Error Recovery", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  test("Error clears when valid input is entered", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter invalid address
    await recipientInput.fill("invalid");
    await sendButton.click();

    // Assert: Error is shown
    const errorMessage = page.locator("text=Invalid address format");
    await expect(errorMessage).toBeVisible();

    // Act: Enter valid address
    await recipientInput.fill(VALID_RECIPIENT);

    // Assert: Error is cleared
    await expect(errorMessage).not.toBeVisible();
  });

  test("Amount error clears when valid amount is entered", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter invalid amount
    await recipientInput.fill(VALID_RECIPIENT);
    await amountInput.fill("-5");
    await sendButton.click();

    // Assert: Error is shown
    const errorMessage = page.locator("text=Amount must be greater than 0");
    await expect(errorMessage).toBeVisible();

    // Act: Enter valid amount
    await amountInput.fill("10");

    // Assert: Error is cleared
    await expect(errorMessage).not.toBeVisible();
  });
});

test.describe("Transfer Form - Input Constraints", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  test("Memo byte counter updates correctly", async ({ page }) => {
    // Arrange: Form is loaded
    const memoInput = page.getByLabel("Memo (optional)");
    const byteCounter = page.locator("text=/\\d+\\/32 bytes/");

    // Act: Enter memo text
    await memoInput.fill("Hello");

    // Assert: Byte counter shows correct count
    await expect(byteCounter).toContainText("5/32 bytes");

    // Act: Clear and enter longer text
    await memoInput.fill("Hello World!");

    // Assert: Byte counter updates
    await expect(byteCounter).toContainText("12/32 bytes");
  });

  test("Recipient input accepts valid checksummed addresses", async ({ page }) => {
    // Arrange: Form is loaded
    const recipientInput = page.getByLabel("Recipient Address");
    const amountInput = page.getByLabel("Amount");
    const sendButton = page.getByRole("button", { name: /^Send$/ });

    // Act: Enter valid checksummed address
    const validAddress = "0x1234567890AbcdEF1234567890aBcdef12345678";
    await recipientInput.fill(validAddress);
    await amountInput.fill("10");
    await sendButton.click();

    // Assert: No error is shown and confirmation screen appears
    const errorMessage = page.locator("text=Invalid address format");
    await expect(errorMessage).not.toBeVisible();
    await expect(page.locator("text=Confirm Transfer")).toBeVisible();
  });

  test("Amount input handles decimal input correctly", async ({ page }) => {
    // Arrange: Form is loaded
    const amountInput = page.getByLabel("Amount");

    // Act: Enter decimal amount
    await amountInput.fill("10.5");

    // Assert: Value is preserved
    await expect(amountInput).toHaveValue("10.5");

    // Act: Enter amount with trailing zeros
    await amountInput.fill("10.100000");

    // Assert: Trailing zeros are preserved in input
    const value = await amountInput.inputValue();
    expect(value).toMatch(/10\.1/);
  });
});
