export function formatAddress(address: string, prefixLen: number, suffixLen: number): string {
  if (!address) {
    return "";
  }

  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
