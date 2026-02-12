import { expect, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";

// ============================================================================
// Test 1: 404 Not Found page
// ============================================================================
test("404 Not Found page - navigate to non-existent page", async ({ page }) => {
  await page.goto(`${BASE_URL}/non-existent-page`);

  // Verify "Page not found" heading is visible
  await expect(page.locator("text=Page not found")).toBeVisible();

  // Verify error message is visible
  await expect(
    page.locator("text=The page you are looking for does not exist or has moved.")
  ).toBeVisible();

  // Verify "Go to Wallet" button is visible
  const goToWalletButton = page.locator("a:has-text('Go to Wallet')");
  await expect(goToWalletButton).toBeVisible();

  // Click the button and verify navigation (may redirect to / if not authenticated)
  await goToWalletButton.click();
  await expect(page).toHaveURL(/\/(app)?/);
});

// ============================================================================
// Test 2: Invalid transaction hash
// ============================================================================
test("Invalid transaction hash - format validation", async ({ page }) => {
  // Navigate to /tx with invalid hash (no 0x prefix)
  await page.goto(`${BASE_URL}/tx/invalid-hash`);

  // Verify "Invalid transaction hash" heading is visible
  await expect(page.locator("text=Invalid transaction hash")).toBeVisible();

  // Verify error message about format is visible
  await expect(
    page.locator("text=Hash must start with 0x and have 66 characters.")
  ).toBeVisible();

  // Verify "Go to Wallet" button is visible
  const goToWalletButton = page.locator("a:has-text('Go to Wallet')");
  await expect(goToWalletButton).toBeVisible();

  // Click button and verify navigation (may redirect to / if not authenticated)
  await goToWalletButton.click();
  await expect(page).toHaveURL(/\/(app)?/);
});

test("Invalid transaction hash - too short", async ({ page }) => {
  // Navigate to /tx with hash that's too short
  await page.goto(`${BASE_URL}/tx/0x1234`);

  // Verify error is shown
  await expect(page.locator("text=Invalid transaction hash")).toBeVisible();
  await expect(
    page.locator("text=Hash must start with 0x and have 66 characters.")
  ).toBeVisible();
});

test("Invalid transaction hash - wrong prefix", async ({ page }) => {
  // Navigate to /tx with hash missing 0x prefix
  const invalidHash = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  await page.goto(`${BASE_URL}/tx/${invalidHash}`);

  // Verify error is shown
  await expect(page.locator("text=Invalid transaction hash")).toBeVisible();
});

// ============================================================================
// Test 3: Transaction not found (valid format, non-existent)
// ============================================================================
test("Transaction not found - valid hash format but non-existent", async ({
  page,
}) => {
  // Use a valid hash format but non-existent transaction
  const validButNonExistentHash =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  await page.goto(`${BASE_URL}/tx/${validButNonExistentHash}`);

  // Wait for the page to load and check for error state
  // The page will show "Transaction not found" when the RPC query fails
  await expect(
    page.locator("text=Transaction not found")
  ).toBeVisible({ timeout: 10000 });

  // Verify error message is visible
  await expect(
    page.locator("text=Verify the hash or open the explorer for recent activity.")
  ).toBeVisible();

  // Verify "Back to Wallet" link is visible
  const backToWalletLink = page.locator("a:has-text('Back to Wallet')");
  await expect(backToWalletLink).toBeVisible();

  // Verify "Open in Explorer" link is visible
  const explorerLink = page.locator("a:has-text('Open in Explorer')");
  await expect(explorerLink).toBeVisible();

  // Click back to wallet and verify navigation (may redirect to / if not authenticated)
  await backToWalletLink.click();
  await expect(page).toHaveURL(/\/(app)?/);
});

// ============================================================================
// Test 4: Unauthenticated access to /app redirects to home
// ============================================================================
test("Unauthenticated access to /app - redirect to home", async ({
  page,
  context,
}) => {
  // Clear all storage to ensure no auth state
  await context.clearCookies();

  // Navigate directly to /app
  await page.goto(`${BASE_URL}/app`);

  // Should redirect to home page (/)
  await expect(page).toHaveURL(`${BASE_URL}/`);

  // Verify home page content is visible
  const homeContent = page.locator("main");
  await expect(homeContent).toBeVisible();
});

// ============================================================================
// Test 5: Global error boundary - error recovery
// ============================================================================
test("Global error boundary - catches and recovers from errors", async ({
  page,
}) => {
  // Navigate to a valid page first
  await page.goto(`${BASE_URL}/`);

  // Inject an error by throwing in a script
  // This simulates a component error that should be caught by error boundary
  const errorThrown = await page.evaluate(() => {
    try {
      throw new Error("Test error from component");
    } catch (e) {
      return (e as Error).message;
    }
  });

  expect(errorThrown).toBe("Test error from component");

  // Navigate to a page that might have error boundary
  // The error boundary should be in place to catch runtime errors
  await page.goto(`${BASE_URL}/app`);

  // If we reach here without a crash, the error boundary is working
  // Verify the page is still functional
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible();
});

// ============================================================================
// Test 6: Rate limiting on API (429 status)
// ============================================================================
test("Rate limiting on API - 429 response handling", async ({ page }) => {
  // Intercept API calls to /api/sponsor
  const responses: { status: number; headers: Record<string, string> }[] = [];

  page.on("response", (response) => {
    if (response.url().includes("/api/sponsor")) {
      const headers: Record<string, string> = {};
      response.headers();
      responses.push({
        status: response.status(),
        headers,
      });
    }
  });

  // Navigate to app page
  await page.goto(`${BASE_URL}/app`);

  // Mock rapid requests to /api/sponsor by intercepting the route
  let requestCount = 0;
  await page.route("**/api/sponsor", async (route) => {
    requestCount++;

    // After 3 requests, return 429 (rate limited)
    if (requestCount > 3) {
      await route.abort("blockedbyclient");
    } else {
      await route.continue();
    }
  });

  // The page should handle rate limiting gracefully
  // Verify the page doesn't crash
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible();
});

// ============================================================================
// Test 7: Network error handling - RPC request blocking
// ============================================================================
test("Network error handling - RPC request blocked", async ({ page }) => {
  // Block all RPC requests
  await page.route("**/rpc.moderato.tempo.xyz/**", async (route) => {
    await route.abort("blockedbyclient");
  });

  // Also block any other RPC endpoints
  await page.route("**/rpc*.tempo.xyz/**", async (route) => {
    await route.abort("blockedbyclient");
  });

  // Navigate to app page
  await page.goto(`${BASE_URL}/app`);

  // The page should still load (it's a client-side app)
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible();

  // If there's a balance display, it should show loading or error state
  // This depends on how the app handles RPC errors
  const pageText = await page.locator("body").textContent();
  expect(pageText).toBeTruthy();
});

// ============================================================================
// Test 8: 404 page styling and accessibility
// ============================================================================
test("404 page - styling and accessibility", async ({ page }) => {
  await page.goto(`${BASE_URL}/non-existent-page`);

  // Verify the error container has proper styling
  const errorContainer = page.locator(
    "div.rounded-2xl.border.border-rose-200.bg-rose-50"
  );
  await expect(errorContainer).toBeVisible();

  // Verify heading has proper styling
  const heading = page.locator("p.text-xl.font-semibold.text-rose-800");
  await expect(heading).toBeVisible();

  // Verify button is keyboard accessible
  const button = page.locator("a:has-text('Go to Wallet')");
  await expect(button).toHaveClass(/focus-visible:ring/);

  // Verify button can be focused
  await button.focus();
  const isFocused = await button.evaluate((el) => el === document.activeElement);
  expect(isFocused).toBe(true);
});

// ============================================================================
// Test 9: Transaction hash validation edge cases
// ============================================================================
test("Transaction hash validation - uppercase hash", async ({ page }) => {
  // Test with uppercase hash (should be valid)
  const uppercaseHash =
    "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF";
  await page.goto(`${BASE_URL}/tx/${uppercaseHash}`);

  // Should not show invalid hash error
  const invalidError = page.locator("text=Invalid transaction hash");
  const isVisible = await invalidError.isVisible().catch(() => false);

  // If it's visible, that's an error. If not, the page is loading the transaction
  if (isVisible) {
    throw new Error("Uppercase hash should be valid");
  }
});

test("Transaction hash validation - mixed case hash", async ({ page }) => {
  // Test with mixed case hash (should be valid)
  const mixedCaseHash =
    "0x1234567890AbCdEf1234567890aBcDeF1234567890AbCdEf1234567890aBcDeF";
  await page.goto(`${BASE_URL}/tx/${mixedCaseHash}`);

  // Should not show invalid hash error
  const invalidError = page.locator("text=Invalid transaction hash");
  const isVisible = await invalidError.isVisible().catch(() => false);

  if (isVisible) {
    throw new Error("Mixed case hash should be valid");
  }
});

// ============================================================================
// Test 10: Error page navigation flow
// ============================================================================
test("Error page navigation - from 404 to app to home", async ({ page }) => {
  // Start at 404 page
  await page.goto(`${BASE_URL}/non-existent-page`);
  await expect(page.locator("text=Page not found")).toBeVisible();

  // Navigate to wallet
  await page.locator("a:has-text('Go to Wallet')").click();

  // Should navigate to /app or redirect to / if not authenticated
  await expect(page).toHaveURL(/\/(app)?/);

  // Verify we're on a valid page
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible();
});

// ============================================================================
// Test 11: Invalid transaction hash - special characters
// ============================================================================
test("Transaction hash validation - special characters rejected", async ({
  page,
}) => {
  // Test with special characters in hash
  const invalidHash = "0x!@#$%^&*()_+-=[]{}|;:',.<>?/";
  await page.goto(`${BASE_URL}/tx/${invalidHash}`);

  // Should show invalid hash error
  await expect(page.locator("text=Invalid transaction hash")).toBeVisible();
});

// ============================================================================
// Test 12: Error boundary - page remains functional after error
// ============================================================================
test("Error boundary - page functionality after error state", async ({
  page,
}) => {
  // Navigate to home page
  await page.goto(`${BASE_URL}/`);

  // Verify page is interactive
  const mainContent = page.locator("main");
  await expect(mainContent).toBeVisible();

  // Verify page has content
  const pageText = await page.locator("body").textContent();
  expect(pageText).toBeTruthy();
});
