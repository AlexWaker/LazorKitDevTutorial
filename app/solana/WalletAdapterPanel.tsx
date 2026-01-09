"use client";

import { useMemo, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

function shortBase58(value: string, head = 6, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function WalletAdapterPanel() {
  const { wallet, publicKey, connected, connecting, disconnecting } =
    useSolanaWallet();
  const [copied, setCopied] = useState(false);

  const pk = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Wallet Adapter (Ecosystem Compatibility)</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            You should see LazorKit, Phantom, and any Wallet Standard wallets installed in your browser (e.g. Backpack) listed side-by-side in the wallet selection modal.
          </div>
        </div>
        <WalletMultiButton className="!h-9 !rounded-lg" />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-zinc-700 dark:text-zinc-300">
        <div>status: {connecting ? "connecting" : disconnecting ? "disconnecting" : connected ? "connected" : "disconnected"}</div>
        <div>wallet: {wallet?.adapter?.name ?? "—"}</div>
        <div className="flex flex-wrap items-center gap-2">
          <div>publicKey: {pk ? shortBase58(pk) : "—"}</div>
          {pk ? (
            <button
              className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] dark:border-zinc-700"
              onClick={async () => {
                await navigator.clipboard.writeText(pk);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}


