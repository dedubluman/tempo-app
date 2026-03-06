import { expect, test } from "@playwright/test";

const FEATURE_TABS = [
  { path: "/app", heading: "Dashboard" },
  { path: "/app/portfolio", heading: "Portfolio" },
  { path: "/app/swap", heading: "Swap" },
  { path: "/app/request", heading: "Request" },
  { path: "/app/forge", heading: "Token Forge" },
  { path: "/app/schedule", heading: "Schedule" },
  { path: "/app/agent", heading: "Agent" },
  { path: "/app/pos", heading: "POS" },
  { path: "/app/stream", heading: "Stream" },
];

test.describe("Cross-Feature Navigation", () => {
  test("all 9 feature tabs load without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (const { path, heading } of FEATURE_TABS) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(heading).first()).toBeVisible({
        timeout: 10_000,
      });
    }

    expect(errors).toHaveLength(0);
  });

  test("sequential tab navigation preserves no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    for (const { path } of FEATURE_TABS.slice(1)) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }

    expect(errors).toHaveLength(0);
  });

  test("portfolio page shows summary and refresh controls", async ({
    page,
  }) => {
    await page.goto("/app/portfolio");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Portfolio").first()).toBeVisible();
    await expect(page.getByText("Total Value").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  });

  test("swap page shows token selectors", async ({ page }) => {
    await page.goto("/app/swap");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("From").first()).toBeVisible();
    await expect(page.getByText("To").first()).toBeVisible();
  });

  test("forge page shows create token form", async ({ page }) => {
    await page.goto("/app/forge");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Token Forge").first()).toBeVisible();
    await expect(page.getByText("Create").first()).toBeVisible();
  });

  test("schedule page shows scheduling form", async ({ page }) => {
    await page.goto("/app/schedule");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Schedule").first()).toBeVisible();
  });

  test("agent page shows AI configuration", async ({ page }) => {
    await page.goto("/app/agent");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Agent").first()).toBeVisible();
  });

  test("POS page shows keypad", async ({ page }) => {
    await page.goto("/app/pos");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("POS").first()).toBeVisible();
  });

  test("stream page shows streaming form", async ({ page }) => {
    await page.goto("/app/stream");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Stream").first()).toBeVisible();
  });
});
