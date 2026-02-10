import { http } from "viem";
import { tempoModerato } from "viem/chains";
import { withFeePayer } from "viem/tempo";
import { createConfig } from "wagmi";
import { KeyManager, webAuthn } from "wagmi/tempo";

export const config = createConfig({
  chains: [tempoModerato],
  connectors: [webAuthn({ keyManager: KeyManager.localStorage() })],
  multiInjectedProviderDiscovery: false,
  transports: {
    [tempoModerato.id]: withFeePayer(
      http(process.env.NEXT_PUBLIC_TEMPO_RPC_URL),
      http("/api/sponsor"),
    ),
  },
});
