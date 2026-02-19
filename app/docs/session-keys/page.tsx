export const metadata = { title: "Session Keys — Fluxus Docs" };

export default function SessionKeysPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[--text-primary] font-[--font-display]">Session Keys</h1>

      <p className="text-[--text-secondary] leading-relaxed">
        Session keys let you pre-authorize spending within defined limits, so you can send transfers without a passkey prompt every time. This is useful for repeated small transfers within a session.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">How it works</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          A session key is a short-lived authorization that specifies: which recipient(s) can receive funds, a maximum spend limit, and a time duration. Within those constraints, transfers can be executed without additional passkey confirmation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Creating a session</h2>
        <ol className="space-y-2 text-sm text-[--text-secondary] list-decimal list-inside">
          <li>Open the Session Keys panel on the dashboard</li>
          <li>Enter a recipient address (or leave blank for any recipient)</li>
          <li>Set a spend limit in pathUSD</li>
          <li>Choose a duration: 15 min, 1 hour, or 24 hours</li>
          <li>Confirm with your passkey to activate the session</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[--text-primary]">Revoking a session</h2>
        <p className="text-sm text-[--text-secondary] leading-relaxed">
          Sessions can be revoked at any time from the Session Keys panel. Expired sessions are automatically cleaned up. Revoking a session immediately prevents further use of that authorization.
        </p>
      </section>

      <div className="rounded-[--radius-xl] border border-[--status-info-border] bg-[--status-info-bg] p-4">
        <p className="text-sm text-[--status-info-text]">
          <strong>Security note:</strong> Session keys are stored locally on your device. They do not persist across devices or browsers. Clearing your browser data removes all session keys.
        </p>
      </div>
    </div>
  );
}
