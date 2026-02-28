import { fallback, http } from "viem";
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
      fallback([
        http(process.env.NEXT_PUBLIC_TEMPO_RPC_URL, {
          retryCount: 3,
          retryDelay: 150,
        }),
        http("https://rpc.moderato.tempo.xyz", {
          retryCount: 3,
          retryDelay: 150,
        }),
        ...(process.env.NEXT_PUBLIC_TEMPO_RPC_FALLBACK
          ? [http(process.env.NEXT_PUBLIC_TEMPO_RPC_FALLBACK, {
              retryCount: 3,
              retryDelay: 150,
            })]
          : []),
      ]),
      http("/api/sponsor"),
    ),
  },
});
