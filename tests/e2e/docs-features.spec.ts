import { expect, test } from "@playwright/test";

const NEW_DOCS_PAGES = [
  { path: "/docs/swap", heading: "Stablecoin Swap" },
  { path: "/docs/payment-requests", heading: "Payment Requests" },
  { path: "/docs/token-forge", heading: "Token Forge" },
  { path: "/docs/scheduled-payments", heading: "Scheduled Payments" },
  { path: "/docs/ai-agent", heading: "AI Agent Wallet" },
  { path: "/docs/portfolio", heading: "Multi-Token Portfolio" },
  { path: "/docs/pos-terminal", heading: "QR POS Terminal" },
  { path: "/docs/streaming", heading: "Streaming Payments" },
];

test.describe("Feature Docs Pages", () => {
  for (const { path, heading } of NEW_DOCS_PAGES) {
    test(`${heading} docs page loads`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible();
      await expect(page.getByText("Tempo Primitives Used")).toBeVisible();
    });
  }

  test("docs sidebar shows all 14 links on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("link", { name: "Overview", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Getting Started", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Security", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Stablecoin Swap", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Token Forge", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "AI Agent Wallet", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "POS Terminal", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: "Streaming Payments", exact: true })
        .first(),
    ).toBeVisible();
  });

  test("docs index shows Advanced Features section", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Advanced Features")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Stablecoin Swap" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Streaming Payments" }).first(),
    ).toBeVisible();
  });
});
