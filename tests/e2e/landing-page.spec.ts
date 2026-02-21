import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("renders hero section with CTA", async ({ page }) => {
    await expect(page.getByTestId("hero-create-cta")).toBeVisible();
    await expect(page.getByText("Instant Stablecoin Payments")).toBeVisible();
  });

  test("nav has launch app button", async ({ page }) => {
    await expect(page.getByTestId("nav-launch-cta")).toBeVisible();
  });

  test("opens auth sheet on CTA click", async ({ page }) => {
    await page.getByTestId("hero-create-cta").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("features section is visible", async ({ page }) => {
    // Scroll into view to trigger whileInView animation
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByText("Instant Send")).toBeVisible();
    await expect(page.getByText("Easy Receive")).toBeVisible();
  });

  test("how it works section is visible", async ({ page }) => {
    // Scroll into view to trigger whileInView animation
    await page.locator("#how-it-works").scrollIntoViewIfNeeded();
    await expect(page.getByText("Up and running in 60 seconds")).toBeVisible();
  });

  test("security section is visible", async ({ page }) => {
    // Scroll into view to trigger whileInView animation
    await page.locator("#security").scrollIntoViewIfNeeded();
    await expect(page.getByText("Built for trust")).toBeVisible();
  });

  test("footer is visible", async ({ page }) => {
    // Scroll to bottom to trigger footer animation
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText("Open source · Testnet only")).toBeVisible();
  });
});

test.describe("Landing Page — Connected User", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("wagmi.webAuthn.activeCredential", "1");
      window.localStorage.setItem("tempo.walletCreated", "1");
      window.localStorage.setItem("tempo.lastAddress", "0xAbcdEF1234567890AbcdEF1234567890aBcdef12");
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("connected user sees Go to Dashboard instead of Create Wallet", async ({ page }) => {
    await expect(page.getByTestId("hero-dashboard-cta")).toBeVisible();
    await expect(page.getByTestId("nav-dashboard-cta")).toBeVisible();
  });
});

test.describe("Landing Page — Reduced Motion", () => {
  test("page renders correctly with prefers-reduced-motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("hero-create-cta")).toBeVisible();
    await expect(page.getByText("Instant Stablecoin Payments")).toBeVisible();

    await context.close();
  });
});
