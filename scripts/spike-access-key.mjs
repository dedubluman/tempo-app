import {
  createClient,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import { tempoModerato } from "viem/chains";
import { Abis, Account, Actions, Addresses, withFeePayer } from "viem/tempo";

const RPC_URL = process.env.NEXT_PUBLIC_TEMPO_RPC_URL || "https://rpc.moderato.tempo.xyz";
const SPONSOR_URL = process.env.SPIKE_SPONSOR_URL || "http://127.0.0.1:3000/api/sponsor";

const ROOT_PRIVATE_KEY =
  process.env.SPIKE_ROOT_PRIVATE_KEY ||
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce036f0af58f5f3f8d4a1d9";

const ACCESS_PRIVATE_KEY =
  process.env.SPIKE_ACCESS_PRIVATE_KEY ||
  "0x6c875f57a85f4d8e2af2f6bc92bcfbe3e1e19794b2074fa3437ea1e247e7904d";

const RECIPIENT_ADDRESS =
  process.env.SPIKE_RECIPIENT_ADDRESS || "0x1234567890AbcdEF1234567890aBcdef12345678";

const AMOUNT = parseUnits("1", 6);
const SPENDING_LIMIT = parseUnits("5", 6);
const ACCOUNT_KEYCHAIN_ADDRESS = "0xaaaaaaaa00000000000000000000000000000000";

function stringifyError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function toJsonSafe(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(toJsonSafe);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonSafe(item)]),
    );
  }

  return value;
}

async function ensureFunding(client, publicClient, accountAddress) {
  const currentBalance = await publicClient.readContract({
    address: Addresses.pathUsd,
    abi: Abis.tip20,
    functionName: "balanceOf",
    args: [accountAddress],
  });

  if (currentBalance >= AMOUNT) {
    return { funded: false, balance: currentBalance };
  }

  const hashes = await Actions.faucet.fund(client, {
    account: accountAddress,
  });

  for (const hash of hashes) {
    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
  }

  const balanceAfter = await publicClient.readContract({
    address: Addresses.pathUsd,
    abi: Abis.tip20,
    functionName: "balanceOf",
    args: [accountAddress],
  });

  return { funded: true, balance: balanceAfter, faucetHashes: hashes };
}

async function main() {
  const rootAccount = Account.fromSecp256k1(ROOT_PRIVATE_KEY);
  const accessAccount = Account.fromSecp256k1(ACCESS_PRIVATE_KEY, { access: rootAccount });

  const baseClient = createClient({
    chain: tempoModerato,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: tempoModerato,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account: accessAccount,
    chain: tempoModerato,
    transport: withFeePayer(http(RPC_URL), http(SPONSOR_URL)),
  });

  const funding = await ensureFunding(baseClient, publicClient, rootAccount.address);

  const keyAuthorization = await rootAccount.signKeyAuthorization(accessAccount, {
    expiry: Math.floor(Date.now() / 1000) + 60 * 60,
    limits: [{ token: Addresses.pathUsd, limit: SPENDING_LIMIT }],
  });

  let usedKeyAuthorization = true;
  let hash;

  try {
    hash = await walletClient.writeContract({
      address: Addresses.pathUsd,
      abi: Abis.tip20,
      functionName: "transfer",
      args: [RECIPIENT_ADDRESS, AMOUNT],
      keyAuthorization,
      feePayer: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("KeyAlreadyExists")) {
      throw error;
    }

    usedKeyAuthorization = false;
    hash = await walletClient.writeContract({
      address: Addresses.pathUsd,
      abi: Abis.tip20,
      functionName: "transfer",
      args: [RECIPIENT_ADDRESS, AMOUNT],
      feePayer: true,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const keyInfo = await publicClient.readContract({
    address: ACCOUNT_KEYCHAIN_ADDRESS,
    abi: Abis.accountKeychain,
    functionName: "getKey",
    args: [rootAccount.address, accessAccount.accessKeyAddress],
  });

  const remainingLimit = await publicClient.readContract({
    address: ACCOUNT_KEYCHAIN_ADDRESS,
    abi: Abis.accountKeychain,
    functionName: "getRemainingLimit",
    args: [rootAccount.address, accessAccount.accessKeyAddress, Addresses.pathUsd],
  });

  const rootBalanceAfter = await publicClient.readContract({
    address: Addresses.pathUsd,
    abi: Abis.tip20,
    functionName: "balanceOf",
    args: [rootAccount.address],
  });

  const result = {
    status: "PASS",
    chainId: tempoModerato.id,
    rpcUrl: RPC_URL,
    sponsorUrl: SPONSOR_URL,
    rootAccount: rootAccount.address,
    accessKeyAddress: accessAccount.accessKeyAddress,
    recipient: RECIPIENT_ADDRESS,
    transferAmount: formatUnits(AMOUNT, 6),
    usedKeyAuthorization,
    txHash: hash,
    receiptStatus: receipt.status,
    blockNumber: receipt.blockNumber.toString(),
    faucetFunded: Boolean(funding.funded),
    faucetHashes: funding.faucetHashes || [],
    rootBalanceAfter: formatUnits(rootBalanceAfter, 6),
    keyInfo: toJsonSafe(keyInfo),
    remainingLimit: formatUnits(remainingLimit, 6),
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const result = {
    status: "FAIL",
    chainId: tempoModerato.id,
    rpcUrl: RPC_URL,
    sponsorUrl: SPONSOR_URL,
    error: stringifyError(error),
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
});
