import type { Page, Locator } from "@playwright/test";

/**
 * Page object for PasskeyAuth component interactions
 */
export class PasskeyAuthPage {
  readonly page: Page;
  readonly createWalletButton: Locator;
  readonly signInButton: Locator;
  readonly disconnectButton: Locator;
  readonly addressDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createWalletButton = page.getByRole("button", { name: /Create Wallet/i }).first();
    this.signInButton = page.getByRole("button", { name: /Sign In/i }).first();
    this.disconnectButton = page.getByRole("button", { name: /Sign Out|Disconnect/i });
    this.addressDisplay = page.locator("[title^='0x']").first();
  }

  async createWallet(): Promise<void> {
    await this.createWalletButton.click();
    await this.page.waitForURL(/\/app/, { timeout: 30000 });
  }

  async signIn(): Promise<void> {
    await this.signInButton.click();
    await this.page.waitForURL(/\/app/, { timeout: 30000 });
  }

  async disconnect(): Promise<void> {
    await this.disconnectButton.click();
  }

  async getAddress(): Promise<string | null> {
    return this.addressDisplay.getAttribute("title");
  }

  async isCreateWalletVisible(): Promise<boolean> {
    return this.createWalletButton.isVisible();
  }

  async isSignInVisible(): Promise<boolean> {
    return this.signInButton.isVisible();
  }
}
