export function prettyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied") || lower.includes("rejected")) {
    return "Action cancelled in passkey confirmation.";
  }
  if (lower.includes("insufficient") || lower.includes("sponsor") || lower.includes("fee")) {
    return "Insufficient balance or session key limit reached.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("rpc")) {
    return "Network is slow. Please try again.";
  }
  return message.split("\n")[0] || "Something went wrong";
}
