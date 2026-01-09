export type LazorCredentialRecord = {
  smartWallet: string;
  credentialId: string;
  walletDevice: string;
  platform: string;
  accountName?: string;
  lastSeenAt: number;
};

const STORAGE_KEY = "lazorkit-demo-registry-v1";

export function loadRegistry(): LazorCredentialRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as LazorCredentialRecord[];
  } catch {
    return [];
  }
}

export function saveRegistry(items: LazorCredentialRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function upsertRegistry(
  items: LazorCredentialRecord[],
  next: LazorCredentialRecord,
) {
  const now = Date.now();
  const normalized: LazorCredentialRecord = { ...next, lastSeenAt: now };
  const existingIdx = items.findIndex(
    (x) =>
      x.smartWallet === normalized.smartWallet &&
      x.credentialId === normalized.credentialId,
  );
  if (existingIdx >= 0) {
    const copy = items.slice();
    copy[existingIdx] = { ...copy[existingIdx], ...normalized };
    return copy;
  }
  return [normalized, ...items];
}

export function clearRegistry() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}


