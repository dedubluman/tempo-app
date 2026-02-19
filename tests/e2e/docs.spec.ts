import { expect, test } from "@playwright/test";

test.describe("Docs Navigation", () => {
  test("docs index page loads", async ({ page }) => {
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Fluxus Documentation")).toBeVisible();
  });

  test("getting started page loads", async ({ page }) => {
    await page.goto("/docs/getting-started");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Getting Started", level: 1 })).toBeVisible();
    await expect(page.getByText("Create your passkey")).toBeVisible();
  });

  test("send & receive page loads", async ({ page }) => {
    await page.goto("/docs/send-receive");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Single Transfer")).toBeVisible();
    await expect(page.getByText("Batch Transfer")).toBeVisible();
  });

  test("session keys page loads", async ({ page }) => {
    await page.goto("/docs/session-keys");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Session Keys", level: 1 })).toBeVisible();
  });

  test("transaction history page loads", async ({ page }) => {
    await page.goto("/docs/transaction-history");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Transaction History", level: 1 })).toBeVisible();
  });

  test("security page loads", async ({ page }) => {
    await page.goto("/docs/security");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Passkey / WebAuthn")).toBeVisible();
  });

  test("docs sidebar is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/docs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "Getting Started", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Security", exact: true }).first()).toBeVisible();
  });
});
