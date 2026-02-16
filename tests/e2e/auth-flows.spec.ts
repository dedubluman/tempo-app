import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __tempoConfirmMessage?: string;
  }
}

const WALLET_CREATED_FLAG = "tempo.walletCreated";
const LAST_ADDRESS_KEY = "tempo.lastAddress";
const ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.activeCredential";

async function enableVirtualAuthenticator(page: Page) {
  const cdpSession = await page.context().newCDPSession(page);

  await cdpSession.send("WebAuthn.enable");
  await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test.describe("Authentication flows", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await enableVirtualAuthenticator(page);
    
    // Clear localStorage before each test
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("1. Fresh user - Create Wallet flow", async ({ page }) => {
    // Navigate to landing page
    await page.goto("/");

    // Verify landing page is visible
    await expect(page.getByRole("heading", { name: /Passkey P2P Wallet/i })).toBeVisible();

    // Click "Create Wallet" button
    const createWalletButton = page.getByRole("button", { name: /Create Wallet/i }).first();
    await expect(createWalletButton).toBeVisible();
    await createWalletButton.click();

    // Wait for redirect to /app (passkey registration handled by virtual authenticator)
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Verify wallet address is displayed
    const walletAddress = page.locator('p[title^="0x"]').first();
    await expect(walletAddress).toBeVisible();
    const addressText = await walletAddress.getAttribute("title");
    expect(addressText).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Verify "Sign Out" button is visible
    const signOutButton = page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i });
    await expect(signOutButton).toBeVisible();

    // Verify localStorage flags are set
    const walletCreated = await page.evaluate(() => window.localStorage.getItem(WALLET_CREATED_FLAG));
    expect(walletCreated).toBe("1");

    const lastAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(lastAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("2. Returning user - Sign In flow", async ({ page }) => {
    // Setup: Create initial wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Get the created address
    const createdAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(createdAddress).toBeTruthy();

    // Sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Verify localStorage is cleared of active credential
    const activeCredential = await page.evaluate(() => window.localStorage.getItem(ACTIVE_CREDENTIAL_KEY));
    expect(activeCredential).toBeNull();

    // Navigate back to landing page (already there)
    await expect(page.getByRole("heading", { name: /Passkey P2P Wallet/i })).toBeVisible();

    // Click "Sign In" button
    const signInButton = page.getByRole("button", { name: /Sign In|I Already Have a Wallet/i }).first();
    await expect(signInButton).toBeVisible();
    await signInButton.click();

    // Wait for redirect to /app
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Verify same address is displayed
    const restoredAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(restoredAddress).toBe(createdAddress);

    // Verify wallet address matches
    const walletAddress = page.locator('p[title^="0x"]').first();
    const addressText = await walletAddress.getAttribute("title");
    expect(addressText?.toLowerCase()).toBe(createdAddress?.toLowerCase());
  });

  test("3. Disconnect/Sign Out flow", async ({ page }) => {
    // Setup: Create wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Get the created address
    const createdAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(createdAddress).toBeTruthy();

    // Click "Disconnect Wallet" or "Sign Out"
    const disconnectButton = page.getByRole("button", { name: /Disconnect Wallet|Sign Out/i });
    await expect(disconnectButton).toBeVisible();
    await disconnectButton.click();

    // Verify redirect back to /
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Verify landing page is visible
    await expect(page.getByRole("heading", { name: /Passkey P2P Wallet/i })).toBeVisible();

    // Verify localStorage is cleared of active credential
    const activeCredential = await page.evaluate(() => window.localStorage.getItem(ACTIVE_CREDENTIAL_KEY));
    expect(activeCredential).toBeNull();

    // Verify wallet created flag is still set (for returning user detection)
    const walletCreated = await page.evaluate(() => window.localStorage.getItem(WALLET_CREATED_FLAG));
    expect(walletCreated).toBe("1");
  });

  test("4. Create New Wallet (when already has wallet)", async ({ page }) => {
    // Setup: Create initial wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Get the first address
    const firstAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(firstAddress).toBeTruthy();

    // Sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Mock window.confirm to return true (accept creating new wallet)
    await page.addInitScript(() => {
      Object.defineProperty(window, "__tempoConfirmMessage", {
        value: "",
        writable: true,
      });

      const originalConfirm = window.confirm;
      window.confirm = (message?: string) => {
        window.__tempoConfirmMessage = String(message ?? "");
        return true; // Accept creating new wallet
      };

      void originalConfirm;
    });

    // Click "Create New Wallet"
    const createNewWalletButton = page.getByRole("button", { name: /Create New Wallet/i });
    await expect(createNewWalletButton).toBeVisible();
    await createNewWalletButton.click();

    // Wait for redirect to /app
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Get the new address
    const secondAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(secondAddress).toBeTruthy();

    // Verify new address is different from first
    expect(secondAddress?.toLowerCase()).not.toBe(firstAddress?.toLowerCase());

    // Verify wallet address is displayed
    const walletAddress = page.locator('p[title^="0x"]').first();
    const addressText = await walletAddress.getAttribute("title");
    expect(addressText?.toLowerCase()).toBe(secondAddress?.toLowerCase());
  });

  test("5. Error states - Unsupported browser message", async ({ page }) => {
    // Mock window.PublicKeyCredential to undefined
    await page.addInitScript(() => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: undefined,
        writable: true,
      });
    });

    // Navigate to landing page
    await page.goto("/");

    // Verify "Unsupported browser" message is visible
    const unsupportedMessage = page.locator("text=/Unsupported browser|use Chrome|Safari/i");
    await expect(unsupportedMessage).toBeVisible();

    // Verify Create Wallet button is not visible
    const createWalletButton = page.getByRole("button", { name: /Create Wallet/i });
    await expect(createWalletButton).not.toBeVisible();
  });

  test("6. Error states - Cancelled passkey", async ({ page }) => {
    // Mock CDP to reject passkey creation
    await page.addInitScript(() => {
      // Override navigator.credentials.create to simulate cancellation
      const originalCreate = navigator.credentials.create;
      navigator.credentials.create = async () => {
        // Simulate NotAllowedError (user cancelled)
        const error = new DOMException("User cancelled the operation", "NotAllowedError");
        throw error;
      };

      void originalCreate;
    });

    // Navigate to landing page
    await page.goto("/");

    // Click "Create Wallet"
    const createWalletButton = page.getByRole("button", { name: /Create Wallet/i }).first();
    await expect(createWalletButton).toBeVisible();
    await createWalletButton.click();

    // Wait for error message to appear
    const errorMessage = page.locator("text=/cancelled|try again/i");
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });

    // Verify error message mentions cancellation
    const errorText = await errorMessage.textContent();
    expect(errorText?.toLowerCase()).toContain("cancel");

    // Verify still on landing page (no redirect)
    await expect(page).toHaveURL("/", { timeout: 5_000 });
  });

  test("7. Confirmation dialog - Cancel Create New Wallet keeps existing wallet", async ({ page }) => {
    // Setup: Create initial wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Get the first address
    const firstAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(firstAddress).toBeTruthy();

    // Sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Mock window.confirm to return false (cancel creating new wallet)
    await page.addInitScript(() => {
      Object.defineProperty(window, "__tempoConfirmMessage", {
        value: "",
        writable: true,
      });

      const originalConfirm = window.confirm;
      window.confirm = (message?: string) => {
        window.__tempoConfirmMessage = String(message ?? "");
        return false; // Cancel creating new wallet
      };

      void originalConfirm;
    });

    // Click "Create New Wallet"
    const createNewWalletButton = page.getByRole("button", { name: /Create New Wallet/i });
    await expect(createNewWalletButton).toBeVisible();
    await createNewWalletButton.click();

    // Verify confirmation message was shown
    const confirmMessage = await page.evaluate(() => window.__tempoConfirmMessage ?? "");
    expect(confirmMessage).toContain("Current wallet");

    // Wait for sign-in to complete (since user cancelled create, it should sign in instead)
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Verify same address is restored
    const restoredAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(restoredAddress?.toLowerCase()).toBe(firstAddress?.toLowerCase());
  });

  test("8. Multiple sign-in/sign-out cycles maintain address consistency", async ({ page }) => {
    // Create wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    const originalAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(originalAddress).toBeTruthy();

    // First sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // First sign in
    await page.getByRole("button", { name: /Sign In|I Already Have a Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    let currentAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(currentAddress?.toLowerCase()).toBe(originalAddress?.toLowerCase());

    // Second sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Second sign in
    await page.getByRole("button", { name: /Sign In|I Already Have a Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    currentAddress = await page.evaluate(() => window.localStorage.getItem(LAST_ADDRESS_KEY));
    expect(currentAddress?.toLowerCase()).toBe(originalAddress?.toLowerCase());

    // Verify wallet address is still displayed correctly
    const walletAddress = page.locator('p[title^="0x"]').first();
    const addressText = await walletAddress.getAttribute("title");
    expect(addressText?.toLowerCase()).toBe(originalAddress?.toLowerCase());
  });

  test("9. Returning user sees 'Welcome back' message and Sign In button", async ({ page }) => {
    // Setup: Create wallet
    await page.goto("/");
    await page.getByRole("button", { name: /Create Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    // Sign out
    await page.getByRole("button", { name: /Sign Out|Disconnect Wallet/i }).click();
    await expect(page).toHaveURL("/", { timeout: 10_000 });

    // Verify "Welcome back" message is visible
    const welcomeBackMessage = page.locator("text=/Welcome back/i");
    await expect(welcomeBackMessage).toBeVisible();

    // Verify "Sign In" button is visible
    const signInButton = page.getByRole("button", { name: /Sign In/i });
    await expect(signInButton).toBeVisible();

    // Verify "Create New Wallet" button is visible
    const createNewWalletButton = page.getByRole("button", { name: /Create New Wallet/i });
    await expect(createNewWalletButton).toBeVisible();

    // Verify help text mentions passkey
    const helpText = page.locator("text=/Use the same passkey/i");
    await expect(helpText).toBeVisible();
  });

  test("10. Fresh user sees 'New wallet setup' message and Create Wallet button", async ({ page }) => {
    // Navigate to landing page with cleared localStorage
    await page.goto("/");

    // Verify "New wallet setup" message is visible
    const newSetupMessage = page.locator("text=/New wallet setup/i");
    await expect(newSetupMessage).toBeVisible();

    // Verify "Create Wallet" button is visible
    const createWalletButton = page.getByRole("button", { name: /Create Wallet/i }).first();
    await expect(createWalletButton).toBeVisible();

    // Verify "I Already Have a Wallet" button is visible
    const alreadyHaveButton = page.getByRole("button", { name: /I Already Have a Wallet/i });
    await expect(alreadyHaveButton).toBeVisible();

    // Verify help text mentions creating wallet once
    const helpText = page.locator("text=/Create Wallet once/i");
    await expect(helpText).toBeVisible();
  });
});
