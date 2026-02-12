import { test as base, expect, type Page } from "@playwright/test";

/**
 * Extended test fixture with virtual authenticator support
 */
export type TestFixtures = {
  /** Page with virtual authenticator enabled */
  page: Page;
  /** Clear localStorage before test */
  emptyStorage: void;
};

/**
 * Enable virtual WebAuthn authenticator for passkey testing
 */
async function enableVirtualAuthenticator(page: Page): Promise<void> {
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

/**
 * Extended test with fixtures
 */
export const test = base.extend<TestFixtures>({
  // Auto-enable virtual authenticator for every test
  page: async ({ page }, use) => {
    await enableVirtualAuthenticator(page);
    await use(page);
  },

  // Clear localStorage before test
  emptyStorage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await use();
  },
});

export { expect };
