import { expect, test } from "@playwright/test";

test("capture feature flags screenshot", async ({ page }) => {
  await page.goto("/test-components");
  await page.waitForLoadState("networkidle");

  // Take screenshot of the feature flags section
  const featureFlagsSection = page.getByTestId("feature-flags-test");
  await expect(featureFlagsSection).toBeVisible();

  // Scroll to feature flags section
  await featureFlagsSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take full page screenshot
  await page.screenshot({
    path: ".sisyphus/evidence/task-4-feature-gate.png",
  });
});
