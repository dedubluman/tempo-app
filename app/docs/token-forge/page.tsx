export const metadata = { title: "Token Forge — Fluxus Docs" };

export default function TokenForgeDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Token Forge</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Create your own TIP-20 stablecoin using the predeployed TIP-20 Factory. Mint tokens, attach TIP-403 compliance policies, and list your token on the enshrined DEX — all without writing any smart contract code.
      </p>

      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-[--text-primary]">4-Step Wizard</h2>
        {[
          { step: "1", title: "Create Token", body: "Choose a name, symbol, and currency code (USD). The TIP-20 Factory deploys your token contract instantly. You receive DEFAULT_ADMIN_ROLE automatically." },
          { step: "2", title: "Mint Supply", body: "Grant yourself the ISSUER role, then mint your desired supply. All TIP-20 tokens use 6 decimal places — enter amounts in whole units." },
          { step: "3", title: "Attach Policy", body: "Optionally attach a TIP-403 compliance policy to your token. Choose between whitelist (allowlist) or blacklist (blocklist) modes and add addresses." },
          { step: "4", title: "List on DEX", body: "Add initial liquidity to the enshrined Stablecoin DEX. Your token becomes tradeable against other TIP-20 stablecoins immediately." },
        ].map(({ step, title, body }) => (
          <div key={step} className="flex gap-4">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white" style={{ background: "var(--gradient-flux)" }}>
              {step}
            </div>
            <div>
              <h3 className="font-semibold text-[--text-primary] mb-1">{title}</h3>
              <p className="text-sm text-[--text-secondary] leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[--text-primary] mb-3">Tempo Primitives Used</h2>
        <ul className="space-y-2 text-sm text-[--text-secondary]">
          <li><strong className="text-[--text-primary]">TIP-20 Factory</strong> — Predeployed at 0x20fc...0000, creates new stablecoins</li>
          <li><strong className="text-[--text-primary]">RBAC Roles</strong> — DEFAULT_ADMIN_ROLE, ISSUER_ROLE for minting control</li>
          <li><strong className="text-[--text-primary]">TIP-403 Policies</strong> — Whitelist/blacklist compliance enforcement</li>
          <li><strong className="text-[--text-primary]">Enshrined DEX</strong> — Protocol-level token listing and trading</li>
        </ul>
      </div>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Important:</strong> Token creation auto-grants DEFAULT_ADMIN_ROLE but NOT ISSUER_ROLE. The Forge wizard handles the grantRoles step automatically before minting.
        </p>
      </div>
    </div>
  );
}
