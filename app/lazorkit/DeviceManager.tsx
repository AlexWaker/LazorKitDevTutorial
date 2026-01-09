"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StorageManager, StorageUtil, useWallet } from "@lazorkit/wallet";
import {
  clearRegistry,
  loadRegistry,
  saveRegistry,
  upsertRegistry,
  type LazorCredentialRecord,
} from "./deviceRegistry";

function short(value: string, head = 8, tail = 8) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

type Grouped = {
  smartWallet: string;
  accountName?: string;
  records: LazorCredentialRecord[];
  lastSeenAt: number;
};

export default function DeviceManager() {
  const { wallet, isConnected, connect, disconnect } = useWallet();
  const [registry, setRegistry] = useState<LazorCredentialRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRegistry(loadRegistry());
  }, []);

  useEffect(() => {
    if (!wallet) return;
    setRegistry((prev) => {
      const next = upsertRegistry(prev, {
        smartWallet: wallet.smartWallet,
        credentialId: wallet.credentialId,
        walletDevice: wallet.walletDevice,
        platform: wallet.platform,
        accountName: wallet.accountName,
        lastSeenAt: Date.now(),
      });
      saveRegistry(next);
      return next;
    });
  }, [wallet]);

  const groups: Grouped[] = useMemo(() => {
    const by = new Map<string, LazorCredentialRecord[]>();
    for (const r of registry) {
      const list = by.get(r.smartWallet) ?? [];
      list.push(r);
      by.set(r.smartWallet, list);
    }
    const res: Grouped[] = [];
    for (const [smartWallet, records] of by.entries()) {
      const lastSeenAt = Math.max(...records.map((r) => r.lastSeenAt));
      const accountName = records.find((r) => r.accountName)?.accountName;
      res.push({ smartWallet, accountName, records, lastSeenAt });
    }
    res.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return res;
  }, [registry]);

  const handleAddPasskey = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      /**
       * LazorKit “multi-passkey / multi-device” flows are typically handled by the portal:
       * - Here we first disconnect (to avoid silent session restore), then connect again to open the portal.
       * - In the portal, users can choose an existing account and add a new passkey/device (if supported by the portal flow).
       */
      if (isConnected) await disconnect();
      await connect({ feeMode: "paymaster" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [connect, disconnect, isConnected]);

  const handleLogout = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      await disconnect();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [disconnect]);

  const handleClearLocal = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      // Clear LazorKit managed storage (session / credentials)
      await StorageManager.clearWallet();
      StorageUtil.clearCredentials();

      // Clear the demo-maintained multi-device history
      clearRegistry();
      setRegistry([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Session & Multi-device Management (Passkey)</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            This shows passkeys/devices recorded by this browser. Cross-device syncing is handled by the OS-level passkey system (iCloud/Google).
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={handleAddPasskey}
            disabled={busy}
          >
            Add / Link a New Passkey
          </button>
          <button
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            onClick={handleLogout}
            disabled={busy}
          >
            Sign out
          </button>
          <button
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            onClick={handleClearLocal}
            disabled={busy}
          >
            Clear local cache
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-zinc-700 dark:text-zinc-300">
        Current session: {wallet ? `${wallet.accountName ?? "Unnamed"} (${short(wallet.smartWallet)})` : "—"}
      </div>

      {groups.length ? (
        <div className="mt-4 space-y-3">
          {groups.map((g) => (
            <div
              key={g.smartWallet}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium">
                  {g.accountName ?? "Unnamed account"} · {short(g.smartWallet)} ·{" "}
                  {g.records.length} passkey{g.records.length === 1 ? "" : "s"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  lastSeen: {new Date(g.lastSeenAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 grid gap-2">
                {g.records.map((r) => (
                  <div
                    key={`${r.smartWallet}:${r.credentialId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-zinc-50 px-2 py-1 text-[11px] dark:bg-zinc-900"
                  >
                    <div>
                      device: {r.walletDevice} · platform: {r.platform}
                    </div>
                    <div className="text-zinc-500">
                      credentialId: {short(r.credentialId, 12, 12)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-xs text-zinc-500">
          No records yet. After you connect once, this will automatically store the current account and credential info.
        </div>
      )}

      {err ? (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </section>
  );
}


