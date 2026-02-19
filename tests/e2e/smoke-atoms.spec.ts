import { expect, test } from "@playwright/test";

test.describe("Atom/Molecule Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-components");
    await page.waitForLoadState("networkidle");
  });

  test("test page renders without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await expect(page.getByTestId("test-page-heading")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("button variants all render", async ({ page }) => {
    await expect(page.getByTestId("btn-primary")).toBeVisible();
    await expect(page.getByTestId("btn-secondary")).toBeVisible();
    await expect(page.getByTestId("btn-ghost")).toBeVisible();
    await expect(page.getByTestId("btn-danger")).toBeVisible();
    await expect(page.getByTestId("btn-loading")).toBeDisabled();
  });

  test("badge variants all render", async ({ page }) => {
    await expect(page.getByTestId("badge-success")).toBeVisible();
    await expect(page.getByTestId("badge-error")).toBeVisible();
    await expect(page.getByTestId("badge-pending")).toBeVisible();
    await expect(page.getByTestId("badge-brand")).toContainText("Gas: $0 (sponsored)");
  });

  test("cards render", async ({ page }) => {
    await expect(page.getByTestId("card-flat")).toBeVisible();
    await expect(page.getByTestId("card-elevated")).toBeVisible();
  });

  test("skeleton components render", async ({ page }) => {
    await expect(page.getByTestId("skeleton-text")).toBeVisible();
    await expect(page.getByTestId("skeleton-card")).toBeVisible();
  });

  test("empty state renders", async ({ page }) => {
    await expect(page.getByTestId("empty-state-section")).toContainText("No transactions yet");
  });
});
