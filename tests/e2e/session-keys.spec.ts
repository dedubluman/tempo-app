import { expect, test, type Page } from "@playwright/test";
import { enableVirtualAuthenticator } from "./helpers/passkey";

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

test.describe("Session Keys", () => {
  test.beforeEach(async ({ page }) => {
    await enableVirtualAuthenticator(page);
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("auth baseline redirects unauthenticated /app to landing", async ({ page }) => {
    await page.goto(`${AUTH_BASE_URL}/app`);

    await expect(page).toHaveURL(`${AUTH_BASE_URL}/`);
    await expect(page.getByRole("heading", { name: /Passkey P2P Wallet/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Wallet|Create New Wallet/i }).first()).toBeVisible();
  });

  test("creates and revokes a session key without localStorage session keys", async ({ page }) => {
    test.skip(!RUN_DASHBOARD_SCENARIOS, "Requires passkey auth to successfully reach /app dashboard.");

    await navigateToDashboardWithMockWallet(page, MOCK_USER_ADDRESS);

    const sessionCard = page.locator("section").filter({ has: page.getByText("Session Keys", { exact: true }) });
    await expect(sessionCard).toBeVisible();

    await sessionCard.getByRole("button", { name: "Create Session" }).click();
    await expect(sessionCard.getByText("Active Session", { exact: true })).toBeVisible({ timeout: 30_000 });

    const sessionLocalStorageKeys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.toLowerCase().includes("session")),
    );
    expect(sessionLocalStorageKeys).toEqual([]);

    await sessionCard.getByRole("button", { name: "Revoke" }).click();
    await expect(sessionCard.getByText("No active sessions. Transfers require passkey confirmation.")).toBeVisible();
  });
});
