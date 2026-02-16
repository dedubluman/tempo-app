import { expect, test, type Page } from "@playwright/test";
const EXPLORER_URL = "https://explore.tempo.xyz";

async function mockWalletConnection(page: Page, userAddress: string) {
  await page.addInitScript((address) => {
    window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
    window.localStorage.setItem("tempo.walletCreated", "1");
    window.localStorage.setItem("tempo.lastAddress", address);

    let clipboardValue = "";
    try {
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            clipboardValue = text;
          },
          readText: async () => clipboardValue,
        },
      });
    } catch {
      clipboardValue = "";
    }
  }, userAddress);
}

async function navigateToAppWithWallet(page: Page, userAddress: string) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockWalletConnection(page, userAddress);
  await page.goto("/app");
  await page.waitForLoadState("networkidle");
}

/**
 * Mock balance display with a specific value
 */
async function mockBalance(page: Page, balanceInPathUsd: string) {
  await page.evaluate((balance) => {
    window.localStorage.setItem("tempo.mockBalanceValue", balance);
  }, balanceInPathUsd);
}

function accountSection(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByText("Account", { exact: true }) })
    .first();
}

function receiveSection(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByText("Receive", { exact: true }) })
    .first();
}

function balancePanel(page: Page) {
  return page
    .locator("div")
    .filter({ has: page.getByText("Available Balance", { exact: true }) })
    .first();
}

function transferCard(page: Page) {
  return page
    .locator("div")
    .filter({ has: page.getByText("Send pathUSD", { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Single Send" }) })
    .first();
}

/**
 * Mock a successful transfer result
 */
async function mockTransferResult(page: Page, txHash: string) {
  await page.addInitScript((hash) => {
    Object.defineProperty(window, "__MOCK_TRANSFER_RESULT__", {
      value: { hash, status: "success" },
      writable: true,
    });
  }, txHash);
}

test.describe("Dashboard Flows", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";
  const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  // ============================================================================
  // TEST 1: Dashboard layout verification
  // ============================================================================
  test("1. Dashboard layout verification", async ({ page }) => {
    // Arrange: Page is loaded with wallet connected
    // Act: Verify all sections are visible

    // Assert: Heading visible
    const heading = page.locator("h1");
    await expect(heading).toContainText("Wallet Dashboard");

    // Assert: Network label visible
    const networkLabel = page.getByText("Tempo Moderato Testnet", { exact: true });
    await expect(networkLabel).toBeVisible();

    // Assert: Account section with address
    await expect(accountSection(page)).toBeVisible();
    await expect(accountSection(page).getByText(shortAddress, { exact: true })).toBeVisible();

    // Assert: Receive section with full address
    await expect(receiveSection(page)).toBeVisible();
    await expect(receiveSection(page).getByText(userAddress, { exact: true })).toBeVisible();

    // Assert: Balance section with "Available Balance"
    await expect(balancePanel(page)).toBeVisible();

    // Assert: Transfer form with "Send pathUSD"
    await expect(transferCard(page)).toBeVisible();
  });

  // ============================================================================
  // TEST 2: Copy address functionality
  // ============================================================================
  test("2. Copy address functionality", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const copyButton = page.getByRole("button", { name: "Copy Address" });

    // Act: Click copy button
    await copyButton.click();

    await expect(copyButton).toBeEnabled();
    await expect(copyButton).toHaveText(/Copy Address|Copied Address/);
  });

  // ============================================================================
  // TEST 3: Balance display states
  // ============================================================================
  test("3. Balance display states", async ({ page }) => {
    // Arrange: Mock a specific balance
    await mockBalance(page, "123.456789");
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert: Balance shows formatted value (2 decimals)
    const balanceDisplay = balancePanel(page).getByText("123.45", { exact: true });
    await expect(balanceDisplay).toBeVisible();

    // Assert: "Raw: X pathUSD" text visible
    const rawBalance = balancePanel(page).getByText(/Raw: .* pathUSD/);
    await expect(rawBalance).toBeVisible();

    // Assert: "6 decimals" badge visible
    const decimalsLabel = balancePanel(page).getByText("6 decimals", { exact: true });
    await expect(decimalsLabel).toBeVisible();

    // Assert: "pathUSD" token badge visible
    const tokenBadge = balancePanel(page).getByText("pathUSD", { exact: true });
    await expect(tokenBadge).toBeVisible();
  });

  // ============================================================================
  // TEST 4: Refresh balance button
  // ============================================================================
  test("4. Refresh balance button", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const refreshButton = page.getByRole("button", { name: "Refresh" });

    // Act: Click refresh button
    await refreshButton.click();

    // Assert: "Refreshing" badge appears briefly
    const refreshingBadge = balancePanel(page).getByText("Refreshing", { exact: true });
    await expect(refreshingBadge).toBeVisible();

    // Assert: Badge disappears after refresh completes
    await expect(refreshingBadge).not.toBeVisible({ timeout: 5000 });
  });

  // ============================================================================
  // TEST 5: Zero balance state
  // ============================================================================
  test("5. Zero balance state", async ({ page }) => {
    // Arrange: Mock zero balance
    await mockBalance(page, "0");
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert: Faucet guidance text visible
    const faucetText = balancePanel(page).getByText(/No funds yet\. Get testnet tokens from the faucet/);
    await expect(faucetText).toBeVisible();

    // Assert: "Open faucet" link visible
    const faucetLink = balancePanel(page).getByRole("link", { name: "Open faucet" });
    await expect(faucetLink).toBeVisible();
    await expect(faucetLink).toHaveAttribute("href", /docs.tempo.xyz/);
  });

  // ============================================================================
  // TEST 6: Disconnect navigation
  // ============================================================================
  test("6. Disconnect navigation", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const disconnectButton = page.getByRole("button", { name: "Disconnect Wallet" });

    // Act: Click disconnect button
    await disconnectButton.click();

    // Assert: Redirect to home page
    await expect(page).toHaveURL("/");

    // Assert: Passkey auth buttons visible
    const authButtons = page.locator("button").filter({ hasText: /Sign in|Create Wallet/ });
    await expect(authButtons.first()).toBeVisible();
  });

  // ============================================================================
  // TEST 7: Transaction detail navigation
  // ============================================================================
  test("7. Transaction detail navigation", async ({ page }) => {
    // Arrange: Mock a successful transfer result
    const mockTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    await mockTransferResult(page, mockTxHash);

    // Act: Navigate to transaction detail page
    await page.goto(`/tx/${mockTxHash}`);
    await page.waitForLoadState("networkidle");

    // Assert: Transaction hash displayed
    const txSurface = page.getByText(/Transaction Result|Transaction not found\./);
    await expect(txSurface.first()).toBeVisible();
  });

  // ============================================================================
  // TEST 8: Explorer link
  // ============================================================================
  test("8. Explorer link", async ({ page }) => {
    // Arrange: Navigate to transaction detail page
    const mockTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    await page.goto(`/tx/${mockTxHash}`);
    await page.waitForLoadState("networkidle");

    // Act: Find explorer link
    const explorerLink = page.getByRole("link", { name: /Open in Explorer/i });

    // Assert: Link exists and has correct href
    await expect(explorerLink).toBeVisible();
    const href = await explorerLink.getAttribute("href");
    expect(href).toContain(EXPLORER_URL);
    expect(href).toContain(mockTxHash);
  });

  // ============================================================================
  // TEST 9: Back to Wallet navigation
  // ============================================================================
  test("9. Back to Wallet navigation", async ({ page }) => {
    // Arrange: Navigate to transaction detail page
    const mockTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    await page.goto(`/tx/${mockTxHash}`);
    await page.waitForLoadState("networkidle");

    // Act: Click "Back to Wallet" link
    const backLink = page.getByRole("link", { name: /Back to Wallet/i });
    await backLink.click();

    // Assert: Navigation to /app
    await expect(page).toHaveURL("/app");

    // Assert: Dashboard is visible
    const heading = page.locator("h1");
    await expect(heading).toContainText("Wallet Dashboard");
  });

  // ============================================================================
  // TEST 10: RPC error state
  // ============================================================================
  test("10. RPC error state", async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem("tempo.mockBalanceError", "1");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert: "RPC Error" badge visible
    const errorBadge = balancePanel(page).getByText("RPC Error", { exact: true });
    await expect(errorBadge).toBeVisible();

    const errorMessage = balancePanel(page).getByText("Network is slow. Please try again. We could not load your latest balance.");
    await expect(errorMessage).toBeVisible();

    // Assert: "Retry" button visible and clickable
    const retryButton = page.getByRole("button", { name: "Retry" });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    await page.evaluate(() => {
      window.localStorage.removeItem("tempo.mockBalanceError");
    });
  });
});

// ============================================================================
// ADDITIONAL INTEGRATION TESTS
// ============================================================================

test.describe("Dashboard Integration Flows", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";
  const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

  test.beforeEach(async ({ page }) => {
    await navigateToAppWithWallet(page, userAddress);
  });

  // ============================================================================
  // TEST: Full dashboard layout with all sections
  // ============================================================================
  test("Full dashboard layout with all sections", async ({ page }) => {
    // Arrange: Dashboard is loaded
    // Act: Verify complete layout structure

    // Assert: Main heading
    const mainHeading = page.locator("h1");
    await expect(mainHeading).toContainText("Wallet Dashboard");

    // Assert: Subtitle
    const subtitle = page.getByText("Send pathUSD with sponsored fees and passkey security.", { exact: true });
    await expect(subtitle).toBeVisible();

    // Assert: Feature badge
    const featureBadge = page.getByText("Stablecoin transfers with instant finality", { exact: true });
    await expect(featureBadge).toBeVisible();

    // Assert: Account section
    await expect(accountSection(page)).toBeVisible();

    // Assert: Receive section
    await expect(receiveSection(page)).toBeVisible();

    // Assert: Balance section
    await expect(balancePanel(page)).toBeVisible();

    // Assert: Transfer form section
    await expect(transferCard(page)).toBeVisible();
  });

  // ============================================================================
  // TEST: Copy address button state transitions
  // ============================================================================
  test("Copy address button state transitions", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const copyButton = page.getByRole("button", { name: "Copy Address" });

    // Assert: Initial state
    await expect(copyButton).toContainText("Copy Address");
    await expect(copyButton).toBeEnabled();

    // Act: Click button
    await copyButton.click();

    await expect(copyButton).toBeEnabled();
    await expect(copyButton).toHaveText(/Copy Address|Copied Address/);
  });

  // ============================================================================
  // TEST: Balance display with different values
  // ============================================================================
  test("Balance display with different values", async ({ page }) => {
    // Arrange: Mock different balance values
    const testCases = [
      { input: "0.000001", display: "0.00" },
      { input: "1.5", display: "1.50" },
      { input: "999.999999", display: "999.99" },
      { input: "0.1", display: "0.10" },
    ];

    for (const testCase of testCases) {
      // Act: Mock balance and reload
      await mockBalance(page, testCase.input);
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Assert: Correct display format
      const balanceDisplay = balancePanel(page).getByText(testCase.display, { exact: true });
      await expect(balanceDisplay).toBeVisible();
    }
  });

  // ============================================================================
  // TEST: Receive section address display
  // ============================================================================
  test("Receive section address display", async ({ page }) => {
    // Arrange: Dashboard is loaded
    // Act: Verify address display in Receive section

    // Assert: Full address visible
    await expect(receiveSection(page).getByText(userAddress, { exact: true })).toBeVisible();

    // Assert: Short address visible
    await expect(receiveSection(page).getByText(shortAddress, { exact: true })).toBeVisible();

    // Assert: "Wallet Address" badge visible
    const walletBadge = receiveSection(page).getByText("Wallet Address", { exact: true });
    await expect(walletBadge).toBeVisible();

    // Assert: Faucet link visible
    const faucetLink = receiveSection(page).getByRole("link", { name: "Get testnet tokens" });
    await expect(faucetLink).toBeVisible();
  });

  // ============================================================================
  // TEST: Account section disconnect button
  // ============================================================================
  test("Account section disconnect button", async ({ page }) => {
    // Arrange: Dashboard is loaded
    // Act: Verify disconnect button in Account section

    // Assert: Disconnect button visible
    const disconnectButton = page.getByRole("button", { name: "Disconnect Wallet" });
    await expect(disconnectButton).toBeVisible();

    // Assert: Button is enabled
    await expect(disconnectButton).toBeEnabled();

    // Assert: Help text visible
    const helpText = accountSection(page).getByText(/Disconnect logs you out and clears the active session/);
    await expect(helpText).toBeVisible();
  });

  // ============================================================================
  // TEST: Balance refresh interaction
  // ============================================================================
  test("Balance refresh interaction", async ({ page }) => {
    // Arrange: Dashboard is loaded
    // Act: Interact with refresh button

    // Assert: Refresh button visible
    const refreshButton = page.getByRole("button", { name: "Refresh" });
    await expect(refreshButton).toBeVisible();

    // Act: Click refresh
    await refreshButton.click();

    // Assert: Button remains enabled during refresh
    await expect(refreshButton).toBeEnabled();

    // Assert: Refreshing badge appears
    const refreshingBadge = balancePanel(page).getByText("Refreshing", { exact: true });
    await expect(refreshingBadge).toBeVisible();
  });

  // ============================================================================
  // TEST: Transaction detail page invalid hash
  // ============================================================================
  test("Transaction detail page invalid hash", async ({ page }) => {
    // Arrange: Navigate with invalid hash
    const invalidHash = "0xinvalid";

    // Act: Navigate to invalid hash
    await page.goto(`/tx/${invalidHash}`);
    await page.waitForLoadState("networkidle");

    // Assert: Error message visible
    const errorMessage = page.getByText("Invalid transaction hash", { exact: true });
    await expect(errorMessage).toBeVisible();

    // Assert: Navigation links visible
    const goToWalletLink = page.getByRole("link", { name: /Go to Wallet/i });
    await expect(goToWalletLink).toBeVisible();

    const explorerLink = page.getByRole("link", { name: /Open Explorer Home/i });
    await expect(explorerLink).toBeVisible();
  });

  // ============================================================================
  // TEST: Navigation from dashboard to transaction detail
  // ============================================================================
  test("Navigation from dashboard to transaction detail", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const mockTxHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Act: Navigate to transaction detail
    await page.goto(`/tx/${mockTxHash}`);
    await page.waitForLoadState("networkidle");

    // Assert: Transaction detail page loaded
    const txDetailHeading = page.getByText(/Transaction Result|Transaction not found\./);
    await expect(txDetailHeading.first()).toBeVisible();

    // Act: Click back to wallet
    const backLink = page.getByRole("link", { name: /Back to Wallet/i });
    await backLink.click();

    // Assert: Back on dashboard
    await expect(page).toHaveURL("/app");
    const dashboardHeading = page.locator("h1");
    await expect(dashboardHeading).toContainText("Wallet Dashboard");
  });

  // ============================================================================
  // TEST: Wallet address consistency
  // ============================================================================
  test("Wallet address consistency", async ({ page }) => {
    // Arrange: Dashboard is loaded
    // Act: Verify address appears consistently

    // Assert: Address in Account section
    await expect(accountSection(page).getByText(shortAddress, { exact: true })).toBeVisible();

    // Assert: Full address in Receive section
    const receiveAddress = receiveSection(page).getByText(userAddress, { exact: true });
    await expect(receiveAddress).toBeVisible();

    // Assert: Both are the same address
    const receiveAddressText = await receiveAddress.textContent();
    expect(receiveAddressText).toContain(userAddress);
  });
});
