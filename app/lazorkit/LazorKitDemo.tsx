"use client";

import { useCallback, useMemo, useState } from "react";
import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { useWallet } from "@lazorkit/wallet";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

function shortBase58(value: string, head = 6, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function LazorKitDemo() {
  const {
    smartWalletPubkey,
    wallet,
    isConnected,
    isLoading,
    isConnecting,
    isSigning,
    error,
    connect,
    disconnect,
    signMessage,
    signAndSendTransaction,
  } = useWallet();

  const [msg, setMsg] = useState("Hello from LazorKit + Next.js");
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastSignedPayload, setLastSignedPayload] = useState<string | null>(
    null,
  );
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const smartWalletBase58 = smartWalletPubkey?.toBase58() ?? null;

  const statusText = useMemo(() => {
    if (isConnecting) return "Connecting…";
    if (isSigning) return "Signing / Sending…";
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
      setLastSignature(null);
      setLastSignedPayload(null);
      setLastTxSig(null);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [disconnect]);

  const handleSignMessage = useCallback(async () => {
    setLocalError(null);
    setLastTxSig(null);
    try {
      if (!isConnected) {
        await connect({ feeMode: "paymaster" });
      }
      const res = await signMessage(msg);
      setLastSignature(res.signature);
      setLastSignedPayload(res.signedPayload);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [connect, isConnected, msg, signMessage]);

  const handleSendMemoTx = useCallback(async () => {
    setLocalError(null);
    setLastSignature(null);
    setLastSignedPayload(null);
    try {
      if (!isConnected) {
        await connect({ feeMode: "paymaster" });
      }

      // A "no-balance required" instruction (besides fees) for quick testing.
      // Fees are expected to be handled by paymaster in the default flow.
      const ix = new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [],
        data: Buffer.from(msg, "utf8"),
      });

      const sig = await signAndSendTransaction({
        instructions: [ix],
        transactionOptions: {
          clusterSimulation: "devnet",
          // computeUnitLimit: 200_000,
        },
      });

      setLastTxSig(sig);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }, [connect, isConnected, msg, signAndSendTransaction]);

  const mergedError = localError ?? (error ? error.message : null);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          LazorKit Minimal Demo
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Goal: connect (Passkey) → sign a message → send a Devnet Memo transaction
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Status: {statusText}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Smart Wallet: {smartWalletBase58 ? shortBase58(smartWalletBase58) : "—"}
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                className="h-9 rounded-lg bg-black px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
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
        </div>

        {wallet ? (
          <div className="mt-4 grid gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <div>accountName: {wallet.accountName ?? "—"}</div>
            <div>platform: {wallet.platform ?? "—"}</div>
            <div>walletDevice: {wallet.walletDevice ?? "—"}</div>
            <div>credentialId: {wallet.credentialId ? shortBase58(wallet.credentialId, 10, 10) : "—"}</div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-2">
          <div className="text-sm font-medium">Message</div>
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-2 text-sm outline-none dark:border-zinc-700"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={handleSignMessage}
              disabled={isLoading || isConnecting || isSigning || !msg}
            >
              Sign Message
            </button>
            <button
              className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={handleSendMemoTx}
              disabled={isLoading || isConnecting || isSigning || !msg}
            >
              Send Memo Tx (Devnet)
            </button>
          </div>
        </div>

        {(lastSignature || lastTxSig) && (
          <div className="mt-4 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            {lastSignature ? (
              <div className="break-all">
                <div className="font-medium">signature</div>
                <div>{lastSignature}</div>
              </div>
            ) : null}
            {lastSignedPayload ? (
              <div className="break-all">
                <div className="font-medium">signedPayload</div>
                <div>{lastSignedPayload}</div>
              </div>
            ) : null}
            {lastTxSig ? (
              <div className="break-all">
                <div className="font-medium">txSignature</div>
                <div>{lastTxSig}</div>
              </div>
            ) : null}
          </div>
        )}

        {mergedError ? (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {mergedError}
          </div>
        ) : null}
      </section>

      <footer className="text-xs text-zinc-500 dark:text-zinc-500">
        Uses the Devnet configuration by default (rpc/portal/paymaster). Override via env vars:
        <div className="mt-1">
          NEXT_PUBLIC_LAZORKIT_RPC_URL / NEXT_PUBLIC_LAZORKIT_PORTAL_URL /
          NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL
        </div>
      </footer>
    </div>
  );
}


