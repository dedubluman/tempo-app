import { toFunctionSelector } from "viem";

const WS_URL = "wss://rpc.moderato.tempo.xyz";
const HTTP_RPC_URL = "https://rpc.moderato.tempo.xyz";
const POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes
const WS_CONNECT_TIMEOUT_MS = 5_000;

// ABI selectors for TIP-20 transfer functions
const TRANSFER_SELECTOR = toFunctionSelector("transfer(address,uint256)");
const TRANSFER_WITH_MEMO_SELECTOR = toFunctionSelector(
  "transferWithMemo(address,uint256,bytes32)"
);

export type PaymentCallback = (txHash: string) => void;

export interface PaymentDetectorOptions {
  merchantAddress: `0x${string}`;
  expectedToken: `0x${string}`;
  expectedAmount: bigint;
  onPaymentDetected: PaymentCallback;
  onTimeout: () => void;
  timeoutMs?: number;
}

interface RpcTransaction {
  hash: string;
  to: string | null;
  input: string;
}

interface RpcBlock {
  number: string;
  transactions: RpcTransaction[];
}

interface JsonRpcEnvelope<T> {
  result?: T;
  error?: { message: string };
}

async function fetchTx(hash: string): Promise<RpcTransaction | null> {
  try {
    const res = await fetch(HTTP_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [hash],
      }),
    });
    const json = (await res.json()) as JsonRpcEnvelope<RpcTransaction | null>;
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function fetchLatestBlock(): Promise<RpcBlock | null> {
  try {
    const res = await fetch(HTTP_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBlockByNumber",
        params: ["latest", true],
      }),
    });
    const json = (await res.json()) as JsonRpcEnvelope<RpcBlock | null>;
    return json.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a transaction is a TIP-20 transfer to the merchant for at
 * least the expected amount.
 *
 * Handles both transfer(address,uint256) and
 * transferWithMemo(address,uint256,bytes32) — both share the same first two
 * ABI-encoded parameters.
 */
function isPaymentMatch(tx: RpcTransaction, opts: PaymentDetectorOptions): boolean {
  if (!tx.to || !tx.input || tx.input.length < 10) return false;

  if (tx.to.toLowerCase() !== opts.expectedToken.toLowerCase()) return false;

  const input = tx.input.toLowerCase();
  const isTransfer = input.startsWith(TRANSFER_SELECTOR.toLowerCase());
  const isMemoTransfer = input.startsWith(TRANSFER_WITH_MEMO_SELECTOR.toLowerCase());

  if (!isTransfer && !isMemoTransfer) return false;

  // ABI layout for both selectors:
  //   [0..10)  selector (4 bytes = 8 hex chars + "0x" prefix)
  //   [10..74) to address, ABI-padded to 32 bytes (last 40 chars = actual address)
  //   [74..138) amount, uint256 (64 hex chars)
  if (input.length < 138) return false;

  const recipientHex = "0x" + input.slice(34, 74); // skip 12 zero-bytes of padding
  if (recipientHex !== opts.merchantAddress.toLowerCase()) return false;

  try {
    const txAmount = BigInt("0x" + input.slice(74, 138));
    return txAmount >= opts.expectedAmount;
  } catch {
    return false;
  }
}

export function createPaymentDetector(options: PaymentDetectorOptions): {
  start: () => void;
  stop: () => void;
  isActive: boolean;
} {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let ws: WebSocket | null = null;
  let subscriptionId: string | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pollIntervalId: ReturnType<typeof setInterval> | null = null;
  let wsConnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let detected = false;
  let lastProcessedBlockNum: string | null = null;

  function cleanup(): void {
    active = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pollIntervalId !== null) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    if (wsConnectTimeoutId !== null) {
      clearTimeout(wsConnectTimeoutId);
      wsConnectTimeoutId = null;
    }
    if (ws !== null) {
      const sock = ws;
      ws = null;
      if (subscriptionId && sock.readyState === WebSocket.OPEN) {
        try {
          sock.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "eth_unsubscribe",
              params: [subscriptionId],
            })
          );
        } catch {
          // ignore send errors during teardown
        }
      }
      try {
        sock.close();
      } catch {
        // ignore
      }
    }
    subscriptionId = null;
  }

  function handlePaymentDetected(txHash: string): void {
    if (detected) return;
    detected = true;
    cleanup();
    options.onPaymentDetected(txHash);
  }

  function handleTimeout(): void {
    cleanup();
    options.onTimeout();
  }

  async function checkPendingTx(hash: string): Promise<void> {
    if (detected || !active) return;
    const tx = await fetchTx(hash);
    if (!tx || !active || detected) return;
    if (isPaymentMatch(tx, options)) {
      handlePaymentDetected(tx.hash);
    }
  }

  function startPollingFallback(): void {
    if (pollIntervalId !== null || !active) return;
    console.warn("[PaymentDetector] WebSocket failed, using polling fallback");
    pollIntervalId = setInterval(() => {
      if (!active || detected) return;
      void (async () => {
        const block = await fetchLatestBlock();
        if (!block || !active || detected) return;
        if (block.number === lastProcessedBlockNum) return;
        lastProcessedBlockNum = block.number;
        for (const tx of block.transactions) {
          if (detected) break;
          if (isPaymentMatch(tx, options)) {
            handlePaymentDetected(tx.hash);
            break;
          }
        }
      })();
    }, POLL_INTERVAL_MS);
  }

  function startWebSocket(): void {
    if (typeof WebSocket === "undefined") {
      startPollingFallback();
      return;
    }

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      startPollingFallback();
      return;
    }

    wsConnectTimeoutId = setTimeout(() => {
      wsConnectTimeoutId = null;
      if (ws && ws.readyState !== WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          // ignore
        }
        ws = null;
        if (active && !detected) startPollingFallback();
      }
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (wsConnectTimeoutId !== null) {
        clearTimeout(wsConnectTimeoutId);
        wsConnectTimeoutId = null;
      }
      if (!active || !ws) return;
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_subscribe",
          params: ["newPendingTransactions"],
        })
      );
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!active || detected) return;
      const data = typeof event.data === "string" ? event.data : null;
      if (!data) return;
      try {
        const msg = JSON.parse(data) as {
          id?: number;
          result?: string;
          method?: string;
          params?: { subscription: string; result: string };
          error?: { message: string };
        };
        if (msg.id === 1 && typeof msg.result === "string") {
          subscriptionId = msg.result;
        } else if (msg.method === "eth_subscription" && msg.params?.result) {
          void checkPendingTx(msg.params.result);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      if (wsConnectTimeoutId !== null) {
        clearTimeout(wsConnectTimeoutId);
        wsConnectTimeoutId = null;
      }
      ws = null;
      if (active && !detected) startPollingFallback();
    };

    ws.onclose = () => {
      if (wsConnectTimeoutId !== null) {
        clearTimeout(wsConnectTimeoutId);
        wsConnectTimeoutId = null;
      }
      ws = null;
      if (active && !detected) startPollingFallback();
    };
  }

  const detector = {
    start(): void {
      if (active) return;
      active = true;
      detected = false;
      timeoutId = setTimeout(handleTimeout, timeoutMs);
      startWebSocket();
    },
    stop(): void {
      cleanup();
    },
    get isActive(): boolean {
      return active;
    },
  };

  return detector;
}
