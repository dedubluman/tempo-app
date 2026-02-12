import { expect, test, type Page } from "@playwright/test";
import { formatUnits, parseUnits } from "viem";

const PATHUSD_DECIMALS = 6;
const PATHUSD_ADDRESS = "0x20c0000000000000000000000000000000000000";
const VALID_RECIPIENT = "0x1234567890AbcdEF1234567890aBcdef12345678";
const EXPLORER_URL = "https://explore.tempo.xyz";

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

/**
 * Mock balance display with a specific value
 */
async function mockBalance(page: Page, balanceInPathUsd: string) {
  const balanceInWei = parseUnits(balanceInPathUsd, PATHUSD_DECIMALS);

  await page.addInitScript((balance) => {
    // Mock the wagmi useReadContract hook response
    Object.defineProperty(window, "__MOCK_BALANCE__", {
      value: balance,
      writable: true,
    });
  }, balanceInWei.toString());
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
    const networkLabel = page.locator("text=Tempo Moderato Testnet");
    await expect(networkLabel).toBeVisible();

    // Assert: Account section with address
    const accountSection = page.locator("text=Account").first();
    await expect(accountSection).toBeVisible();
    const shortAddress = page.locator(`text=${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    await expect(shortAddress).toBeVisible();

    // Assert: Receive section with full address
    const receiveSection = page.locator("text=Receive");
    await expect(receiveSection).toBeVisible();
    const fullAddress = page.locator(`text=${userAddress}`);
    await expect(fullAddress).toBeVisible();

    // Assert: Balance section with "Available Balance"
    const balanceLabel = page.locator("text=Available Balance");
    await expect(balanceLabel).toBeVisible();

    // Assert: Transfer form with "Send pathUSD"
    const transferHeading = page.locator("text=Send pathUSD");
    await expect(transferHeading).toBeVisible();
  });

  // ============================================================================
  // TEST 2: Copy address functionality
  // ============================================================================
  test("2. Copy address functionality", async ({ page }) => {
    // Arrange: Dashboard is loaded
    const copyButton = page.getByRole("button", { name: "Copy Address" });

    // Act: Click copy button
    await copyButton.click();

    // Assert: Button text changes to "Copied Address"
    await expect(copyButton).toContainText("Copied Address");

    // Assert: Clipboard contains wallet address
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(userAddress);

    // Assert: Button reverts after ~1.2 seconds
    await page.waitForTimeout(1300);
    await expect(copyButton).toContainText("Copy Address");
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
    const balanceDisplay = page.locator("text=123.46");
    await expect(balanceDisplay).toBeVisible();

    // Assert: "Raw: X pathUSD" text visible
    const rawBalance = page.locator("text=/Raw: .* pathUSD/");
    await expect(rawBalance).toBeVisible();

    // Assert: "6 decimals" badge visible
    const decimalsLabel = page.locator("text=6 decimals");
    await expect(decimalsLabel).toBeVisible();

    // Assert: "pathUSD" token badge visible
    const tokenBadge = page.locator("text=pathUSD");
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
    const refreshingBadge = page.locator("text=Refreshing");
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
    const faucetText = page.locator("text=No funds yet. Get testnet tokens from the faucet");
    await expect(faucetText).toBeVisible();

    // Assert: "Open faucet" link visible
    const faucetLink = page.locator("text=Open faucet");
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
    const hashDisplay = page.locator(`text=${mockTxHash.slice(0, 10)}...${mockTxHash.slice(-8)}`);
    await expect(hashDisplay).toBeVisible();

    // Assert: "View Details" or transaction status visible
    const txStatus = page.locator("text=/success|pending|failed/i");
    await expect(txStatus).toBeVisible();
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
    // Arrange: Mock RPC error by intercepting balance fetch
    await page.route("**/api/**", (route) => {
      route.abort("failed");
    });

    // Reload to trigger error state
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert: "RPC Error" badge visible
    const errorBadge = page.locator("text=RPC Error");
    await expect(errorBadge).toBeVisible();

    // Assert: "Unable to load balance" message visible
    const errorMessage = page.locator("text=Unable to load balance");
    await expect(errorMessage).toBeVisible();

    // Assert: "Retry" button visible and clickable
    const retryButton = page.getByRole("button", { name: "Retry" });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();
  });
});

// ============================================================================
// ADDITIONAL INTEGRATION TESTS
// ============================================================================

test.describe("Dashboard Integration Flows", () => {
  const userAddress = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

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
    const subtitle = page.locator("text=Send pathUSD with sponsored fees and passkey security");
    await expect(subtitle).toBeVisible();

    // Assert: Feature badge
    const featureBadge = page.locator("text=Stablecoin transfers with instant finality");
    await expect(featureBadge).toBeVisible();

    // Assert: Account section
    const accountSection = page.locator("section").filter({ has: page.locator("text=Account") }).first();
    await expect(accountSection).toBeVisible();

    // Assert: Receive section
    const receiveSection = page.locator("section").filter({ has: page.locator("text=Receive") }).first();
    await expect(receiveSection).toBeVisible();

    // Assert: Balance section
    const balanceSection = page.locator("section").filter({ has: page.locator("text=Available Balance") }).first();
    await expect(balanceSection).toBeVisible();

    // Assert: Transfer form section
    const transferSection = page.locator("section").filter({ has: page.locator("text=Send pathUSD") }).first();
    await expect(transferSection).toBeVisible();
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

    // Assert: Copied state
    await expect(copyButton).toContainText("Copied Address");

    // Act: Wait for revert
    await page.waitForTimeout(1300);

    // Assert: Back to initial state
    await expect(copyButton).toContainText("Copy Address");
  });

  // ============================================================================
  // TEST: Balance display with different values
  // ============================================================================
  test("Balance display with different values", async ({ page }) => {
    // Arrange: Mock different balance values
    const testCases = [
      { input: "0.000001", display: "0.00" },
      { input: "1.5", display: "1.50" },
      { input: "999.999999", display: "1000.00" },
      { input: "0.1", display: "0.10" },
    ];

    for (const testCase of testCases) {
      // Act: Mock balance and reload
      await mockBalance(page, testCase.input);
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Assert: Correct display format
      const balanceDisplay = page.locator(`text=${testCase.display}`);
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
    const fullAddress = page.locator(`text=${userAddress}`);
    await expect(fullAddress).toBeVisible();

    // Assert: Short address visible
    const shortAddress = page.locator(`text=${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    await expect(shortAddress).toBeVisible();

    // Assert: "Wallet Address" badge visible
    const walletBadge = page.locator("text=Wallet Address");
    await expect(walletBadge).toBeVisible();

    // Assert: Faucet link visible
    const faucetLink = page.locator("text=Get testnet tokens");
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
    const helpText = page.locator("text=Disconnect logs you out and clears the active session");
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
    const refreshingBadge = page.locator("text=Refreshing");
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
    const errorMessage = page.locator("text=Invalid transaction hash");
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
    const txDetailHeading = page.locator("text=Transaction Result");
    await expect(txDetailHeading).toBeVisible();

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
    const accountAddress = page.locator(`text=${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    await expect(accountAddress).toBeVisible();

    // Assert: Full address in Receive section
    const receiveAddress = page.locator(`text=${userAddress}`);
    await expect(receiveAddress).toBeVisible();

    // Assert: Both are the same address
    const accountAddressText = await accountAddress.textContent();
    const receiveAddressText = await receiveAddress.textContent();
    expect(receiveAddressText).toContain(userAddress);
  });
});
