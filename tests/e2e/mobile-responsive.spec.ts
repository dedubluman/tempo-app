import { expect, test, type Page } from "@playwright/test";

const AUTH_BASE_URL = (process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace("127.0.0.1", "localhost");
const RUN_DASHBOARD_SCENARIOS = process.env.E2E_ENABLE_DASHBOARD_AUTH === "1";
const MOCK_USER_ADDRESS = "0xAbcdEF1234567890AbcdEF1234567890aBcdef12";

const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
] as const;

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
}

test.describe("Mobile Responsive Polish", () => {
  test("landing page has no horizontal overflow at 375/768/1024", async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(`${AUTH_BASE_URL}/`);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: /Passkey P2P Wallet/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);
    }
  });

  test("dashboard touch targets and overflow checks at mobile widths", async ({ page }) => {
    test.skip(!RUN_DASHBOARD_SCENARIOS, "Requires stable dashboard auth baseline in E2E environment.");

    await page.addInitScript((address) => {
      window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
      window.localStorage.setItem("tempo.walletCreated", "1");
      window.localStorage.setItem("tempo.lastAddress", address);
    }, MOCK_USER_ADDRESS);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(`${AUTH_BASE_URL}/app`);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: /Wallet Dashboard/i })).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const buttons = page.getByRole("button");
      const count = await buttons.count();
      for (let i = 0; i < Math.min(count, 6); i += 1) {
        const box = await buttons.nth(i).boundingBox();
        if (!box) continue;
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
