import { TOKEN_REGISTRY } from "@/lib/tokens";

const PATHUSD = TOKEN_REGISTRY[0];
const ALPHAUSD = TOKEN_REGISTRY[1];
const BETAUSD = TOKEN_REGISTRY[2];
const THETAUSD = TOKEN_REGISTRY[3];

export const PATHUSD_ADDRESS = PATHUSD.address;
export const FEE_MANAGER_ADDRESS =
  "0xfeec000000000000000000000000000000000000" as const;
export const PATHUSD_DECIMALS = PATHUSD.decimals;
export const CHAIN_ID = 42431;
export const EXPLORER_URL = "https://explore.tempo.xyz";

export const ALPHAUSD_ADDRESS = ALPHAUSD.address;
export const ALPHAUSD_DECIMALS = ALPHAUSD.decimals;

export const BETAUSD_ADDRESS = BETAUSD.address;
export const BETAUSD_DECIMALS = BETAUSD.decimals;

export const THETAUSD_ADDRESS = THETAUSD.address;
export const THETAUSD_DECIMALS = THETAUSD.decimals;

export const STABLECOIN_DEX_ADDRESS =
  "0xdec0000000000000000000000000000000000000" as const;
export const MULTICALL3_ADDRESS =
  "0xcA11bde05977b3631167028862bE2a173976CA11" as const;
