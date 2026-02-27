import { expect, test } from "@playwright/test";

const VALID_RECIPIENT = "0x1234567890AbcdEF1234567890aBcdef12345678";

test.describe("Payment Request Links", () => {
  test("creates a request link and renders QR", async ({ page }) => {
    await page.goto("/app/request");

    await page.getByLabel("Recipient").fill(VALID_RECIPIENT);
    await page.getByPlaceholder("0.00").fill("5");
    await page.getByLabel("Memo (optional)").fill("coffee-order-42");
    await page.getByRole("button", { name: "Create Request" }).click();

    await expect(page.locator("text=Request ready to share")).toBeVisible();

    const generatedLink = page
      .locator("p")
      .filter({ hasText: "/pay?to=" })
      .first();

    await expect(generatedLink).toBeVisible();
    await expect(generatedLink).toContainText("amount=5");
    await expect(generatedLink).toContainText("token=pathUSD");
    await expect(generatedLink).toContainText("memo=coffee-order-42");

    await expect(page.locator("div.bg-white svg").first()).toBeVisible();

    await expect(page.getByRole("button", { name: /Copy Link|Copied/ })).toBeVisible();
  });

  test("public pay page shows connect prompt without wallet", async ({ page }) => {
    await page.goto(`/pay?to=${VALID_RECIPIENT}&amount=5&token=pathUSD&memo=test`);

    await expect(page.locator("text=Payment Request")).toBeVisible();
    await expect(page.getByText("5 pathUSD", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Memo", { exact: true }).first()).toBeVisible();
    await expect(page.locator("text=Connect Wallet to Pay")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay Now/ })).toHaveCount(0);
  });
});
