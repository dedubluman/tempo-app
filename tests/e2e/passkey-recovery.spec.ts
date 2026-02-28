import { expect, test, type Page } from "@playwright/test";

const RUN_AUTH_FLOWS = process.env.E2E_ENABLE_AUTH_FLOWS === "1";
const PASSKEY_RECOVERY_ENABLED = process.env.NEXT_PUBLIC_FF_PASSKEY_RECOVERY === "1";

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

test.describe("Passkey backup recovery", () => {
  test.skip(!RUN_AUTH_FLOWS, "Enable with E2E_ENABLE_AUTH_FLOWS=1.");
  test.skip(!PASSKEY_RECOVERY_ENABLED, "Enable with NEXT_PUBLIC_FF_PASSKEY_RECOVERY=1.");
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await enableVirtualAuthenticator(page);
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("register backup passkey and recover after primary loss simulation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Create( Your)? Wallet/i }).first().click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    await page.goto("/app/settings/recovery");
    await expect(page.getByTestId("recovery-enrollment-page")).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Backup device is ready" }).click();
    await page.getByTestId("register-backup-passkey").click();

    await expect(page.getByTestId("recovery-step-4")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: ".sisyphus/evidence/task-7-backup-registration.png", fullPage: true });

    await page.getByRole("button", { name: "Continue to confirmation" }).click();
    await page.getByTestId("open-recovery-test").click();
    await expect(page).toHaveURL(/\/recover/, { timeout: 15_000 });

    await page.evaluate(() => {
      window.localStorage.removeItem("wagmi.webAuthn.activeCredential");
      window.localStorage.removeItem("wagmi.webAuthn.lastActiveCredential");
      window.localStorage.removeItem("fluxus-session-storage");
    });
    await page.reload();

    await expect(page.getByTestId("recovery-flow-page")).toBeVisible();
    await page.getByTestId("recover-with-passkey").click();

    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await page.screenshot({ path: ".sisyphus/evidence/task-7-recovery-flow.png", fullPage: true });
  });
});
