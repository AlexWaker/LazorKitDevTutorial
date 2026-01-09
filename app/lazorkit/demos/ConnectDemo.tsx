"use client";

import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@lazorkit/wallet";

function shortBase58(value: string, head = 6, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function ConnectDemo() {
  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isLoading,
    isSigning,
    smartWalletPubkey,
    wallet,
    error,
  } = useWallet();

  const [localError, setLocalError] = useState<string | null>(null);
  const mergedError = localError ?? (error ? error.message : null);

  const status = useMemo(() => {
    if (isConnecting) return "Connecting…";
    if (isSigning) return "Signing…";
    if (isConnected) return "Connected";
    return "Disconnected";
  }, [isConnected, isConnecting, isSigning]);

  const handleConnect = useCallback(async () => {
    setLocalError(null);
    try {
      await connect({ feeMode: "paymaster" });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    setLocalError(null);
    try {
      await disconnect();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [disconnect]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Connect Wallet</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Status: {status} · Smart Wallet:
            {smartWalletPubkey ? shortBase58(smartWalletPubkey.toBase58()) : "—"}
          </div>
        </div>
        {!isConnected ? (
          <button
            className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={handleConnect}
            disabled={isLoading || isConnecting || isSigning}
          >
            Connect
          </button>
        ) : (
          <button
            className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            onClick={handleDisconnect}
            disabled={isLoading || isConnecting || isSigning}
          >
            Disconnect
          </button>
        )}
      </div>

      {wallet ? (
        <div className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
          <div>accountName: {wallet.accountName ?? "—"}</div>
          <div>platform: {wallet.platform ?? "—"}</div>
          <div>walletDevice: {wallet.walletDevice ?? "—"}</div>
        </div>
      ) : null}

      {mergedError ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {mergedError}
        </div>
      ) : null}
    </div>
  );
}

