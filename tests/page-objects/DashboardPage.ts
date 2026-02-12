import type { Page, Locator } from "@playwright/test";

/**
 * Page object for Dashboard (app/page) interactions
 */
export class DashboardPage {
  readonly page: Page;
  readonly refreshButton: Locator;
  readonly copyAddressButton: Locator;
  readonly disconnectButton: Locator;
  readonly balanceDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.refreshButton = page.getByRole("button", { name: /Refresh/i });
    this.copyAddressButton = page.getByRole("button", { name: /Copy Address/i });
    this.disconnectButton = page.getByRole("button", { name: /Disconnect/i });
    this.balanceDisplay = page.locator("text=/Raw:\\s+.*\\s+pathUSD/");
  }

  async clickRefreshBalance(): Promise<void> {
    await this.refreshButton.click();
  }

  async clickCopyAddress(): Promise<void> {
    await this.copyAddressButton.click();
  }

  async clickDisconnect(): Promise<void> {
    await this.disconnectButton.click();
    await this.page.waitForURL("/", { timeout: 10000 });
  }

  async getBalance(): Promise<string | null> {
    return this.balanceDisplay.textContent();
  }

  async isBalanceVisible(): Promise<boolean> {
    return this.page.getByText("Available Balance").isVisible();
  }
}
