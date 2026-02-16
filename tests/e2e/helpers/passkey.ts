import type { Page } from "@playwright/test";

export async function enableVirtualAuthenticator(page: Page) {
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

export async function createWalletAndGoToDashboard(page: Page) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto("/");
      await page.evaluate(() => {
        window.localStorage.clear();
      });
      await page.reload();
      page.once("dialog", (dialog) => {
        void dialog.accept();
      });
      await page.getByRole("button", { name: /Create Wallet|Create New Wallet/i }).first().click();
      await page.waitForURL(/\/app/, { timeout: 45_000 });

      const address = await page
        .locator('section:has-text("Receive") p[title^="0x"]')
        .first()
        .getAttribute("title");

      if (!address) {
        throw new Error("Wallet address not found after passkey signup");
      }

      return address;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await page.waitForTimeout(500 * attempt);
      }
    }
  }

  throw new Error(`Passkey signup failed after ${maxAttempts} attempts: ${String(lastError)}`);
}
