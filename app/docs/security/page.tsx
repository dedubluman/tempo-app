export const metadata = { title: "Security — Fluxus Docs" };

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Security</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Fluxus is built on three security pillars: passkey authentication, sponsored gas, and the Tempo blockchain. Here is how each protects you.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Passkey / WebAuthn</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Passkeys use the WebAuthn standard. Your private key never leaves your device — it lives in your OS secure enclave (Secure Element on iOS, TPM on Windows, Keystore on Android). Authentication uses biometrics or device PIN. There is no password to steal and no seed phrase to lose or expose.
        </p>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Passkeys are bound to the domain they were created on. A passkey created on fluxus.app cannot be used on a different domain — protecting you from phishing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Sponsored gas</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          All Fluxus transfers are gas-sponsored by the Tempo fee sponsorship system. You do not hold or manage any native tokens. This means your account cannot be drained through gas fees, and you do not need to manage two separate token balances.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Tempo blockchain</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Tempo is an EVM-compatible blockchain with native WebAuthn/passkey support at the protocol level. Smart accounts and passkey-based signing are first-class features, not add-ons.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">What Fluxus does NOT do</h2>
        <ul className="space-y-1 text-sm text-[--text-secondary] list-disc list-inside">
          <li>Does not store your private key anywhere</li>
          <li>Does not send your passkey data to any server</li>
          <li>Does not require an email, phone number, or KYC</li>
          <li>Does not have a backend that can be hacked to access your funds</li>
        </ul>
      </section>

      <div className="rounded-[--radius-xl] border border-[--status-warning-border] bg-[--status-warning-bg] p-4">
        <p className="text-sm text-[--status-warning-text]">
          <strong>Testnet only:</strong> Fluxus currently runs on the Tempo Moderato Testnet. Do not send real value. This is for testing and development purposes only.
        </p>
      </div>
    </div>
  );
}
