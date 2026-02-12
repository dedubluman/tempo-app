import { expect, test, type Page } from "@playwright/test";
import { createPublicClient, createWalletClient, http, isAddress, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tempoModerato } from "viem/chains";

declare global {
  interface Window {
    __tempoConfirmMessage?: string;
  }
}

const PATHUSD_ADDRESS = "0x20c0000000000000000000000000000000000000";
const PATHUSD_DECIMALS = 6;
const E2E_SEEDED_ADDRESS = "0x1234567890AbcdEF1234567890aBcdef12345678";
const RPC_URL = process.env.NEXT_PUBLIC_TEMPO_RPC_URL || "https://rpc.moderato.tempo.xyz";

const transferAbi = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function enableVirtualAuthenticator(page: Page) {
  const cdpSession = await page.context().newCDPSession(page);

  await cdpSession.send("WebAuthn.enable");
  await cdpSession.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function sendPathUsdToAddress(to: `0x${string}`, amount: string) {
  const privateKey = process.env.E2E_FUNDED_PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error("E2E_FUNDED_PRIVATE_KEY is required for live balance scenario.");
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: tempoModerato,
    transport: http(RPC_URL),
  });

  const hash = await walletClient.writeContract({
    address: PATHUSD_ADDRESS,
    abi: transferAbi,
    functionName: "transfer",
    args: [to, parseUnits(amount, PATHUSD_DECIMALS)],
  });

  const publicClient = createPublicClient({
    chain: tempoModerato,
    transport: http(RPC_URL),
  });

  await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });
}

test.describe("Passkey wallet regression coverage", () => {
  test.beforeEach(async ({ page }) => {
    await enableVirtualAuthenticator(page);
  });

  test("asks reset confirmation and keeps existing wallet flow when user cancels", async ({ page }) => {
    await page.addInitScript((seededAddress) => {
      Object.defineProperty(window, "__tempoConfirmMessage", {
        value: "",
        writable: true,
      });

      const originalConfirm = window.confirm;
      window.confirm = (message?: string) => {
        window.__tempoConfirmMessage = String(message ?? "");
        return false;
      };

      window.localStorage.setItem("tempo.walletCreated", "1");
      window.localStorage.setItem("tempo.lastAddress", seededAddress);

      void originalConfirm;
    }, E2E_SEEDED_ADDRESS);

    await page.goto("/");

    const createWalletButton = page
      .getByRole("button", { name: /Create Wallet|Create New Wallet/i })
      .first();
    await expect(createWalletButton).toBeVisible();

    await createWalletButton.click();

    const confirmMessage = await page.evaluate(() => window.__tempoConfirmMessage ?? "");
    expect(confirmMessage).toContain("Current wallet");
    expect(confirmMessage).toContain("Press Cancel to keep it");

    await expect(page.getByRole("button", { name: /Waiting for passkey|Sign In/i })).toBeVisible();
  });

  test("updates balance without manual page refresh after external transfer", async ({ page }) => {
    test.skip(process.env.E2E_ENABLE_LIVE_BALANCE !== "1", "Enable with E2E_ENABLE_LIVE_BALANCE=1 and funded sender env.");

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto("/");

    await page.getByRole("button", { name: /Create Wallet/i }).click();
    await expect(page).toHaveURL(/\/app/, { timeout: 30_000 });

    const receiveAddress = await page
      .locator('section:has-text("Receive") p[title^="0x"]')
      .first()
      .getAttribute("title");

    expect(receiveAddress).not.toBeNull();
    expect(isAddress(receiveAddress ?? "")).toBeTruthy();

    const rawBalance = page.locator("text=/Raw:\\s+.*\\s+pathUSD/").first();
    const before = (await rawBalance.textContent())?.trim();
    expect(before).toBeTruthy();

    await sendPathUsdToAddress(receiveAddress as `0x${string}`, "0.01");

    await expect(rawBalance).not.toHaveText(before ?? "", { timeout: 45_000 });
  });
});
