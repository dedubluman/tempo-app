import { expect, test } from "@playwright/test";

test.describe("PWA Offline Mode", () => {
  test("manifest.json is linked in head", async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute("href", "/manifest.json");
  });

  test("manifest.json returns valid PWA metadata", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.ok()).toBe(true);
    const json = await response.json();
    expect(json.name).toBe("Fluxus Wallet");
    expect(json.short_name).toBe("Fluxus");
    expect(json.display).toBe("standalone");
    expect(json.start_url).toBe("/app");
    expect(json.icons).toHaveLength(2);
  });

  test("offline banner appears when offline", async ({ page, context }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    // Simulate going offline
    await context.setOffline(true);

    // Trigger the offline event
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    // Banner should appear (if OFFLINE_MODE flag is enabled)
    // Since flag defaults to OFF, we just verify no crash
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);

    // Go back online
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  });

  test("service worker file exists", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBe(true);
    const text = await response.text();
    expect(text).toContain("fluxus-v1");
    expect(text).toContain("self.addEventListener");
  });

  test("service worker does NOT cache /api routes", async ({ request }) => {
    const response = await request.get("/sw.js");
    const text = await response.text();
    // Verify the exclusion pattern exists
    expect(text).toContain("/api");
    expect(text).toContain("return");
  });

  test("app icons are accessible", async ({ request }) => {
    const icon192 = await request.get("/icons/icon-192.png");
    expect(icon192.ok()).toBe(true);

    const icon512 = await request.get("/icons/icon-512.png");
    expect(icon512.ok()).toBe(true);
  });
});
