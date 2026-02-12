import type { Page, Locator } from "@playwright/test";

/**
 * Page object for TransferForm component interactions
 */
export class TransferPage {
  readonly page: Page;
  readonly recipientInput: Locator;
  readonly amountInput: Locator;
  readonly memoInput: Locator;
  readonly sendButton: Locator;
  readonly maxButton: Locator;
  readonly confirmButton: Locator;
  readonly editButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.recipientInput = page.getByLabel("Recipient Address");
    this.amountInput = page.getByLabel("Amount");
    this.memoInput = page.getByLabel("Memo");
    this.sendButton = page.getByRole("button", { name: /^Send$/ });
    this.maxButton = page.getByRole("button", { name: /Max/i });
    this.confirmButton = page.getByRole("button", { name: /Confirm/i });
    this.editButton = page.getByRole("button", { name: /Edit/i });
  }

  async fillRecipient(address: string): Promise<void> {
    await this.recipientInput.fill(address);
  }

  async fillAmount(amount: string): Promise<void> {
    await this.amountInput.fill(amount);
  }

  async fillMemo(memo: string): Promise<void> {
    await this.memoInput.fill(memo);
  }

  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  async clickConfirm(): Promise<void> {
    await this.confirmButton.click();
  }

  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  async clickMax(): Promise<void> {
    await this.maxButton.click();
  }

  async getRecipientError(): Promise<string | null> {
    const error = this.page.locator("text=Recipient").locator("..").locator("text=/error/i");
    return error.textContent();
  }

  async getAmountError(): Promise<string | null> {
    const error = this.page.locator("text=Amount").locator("..").locator("text=/error/i");
    return error.textContent();
  }

  async isConfirmationVisible(): Promise<boolean> {
    return this.page.getByText("Confirm Transfer").isVisible();
  }

  async isSuccessVisible(): Promise<boolean> {
    return this.page.getByText("Transfer Successful").isVisible();
  }
}
