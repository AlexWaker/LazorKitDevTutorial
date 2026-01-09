"use client";

import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { useWallet } from "@lazorkit/wallet";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export default function SendTxDemo() {
  const { connect, isConnected, isConnecting, isSigning, signAndSendTransaction } =
    useWallet();
  const [msg, setMsg] = useState("Memo from LazorKit");
  const [sig, setSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setErr(null);
    setSig(null);
    try {
      if (!isConnected) await connect({ feeMode: "paymaster" });
      const ix = new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [],
        data: Buffer.from(msg, "utf8"),
      });
      const s = await signAndSendTransaction({
        instructions: [ix],
        transactionOptions: { clusterSimulation: "devnet" },
      });
      setSig(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [connect, isConnected, msg, signAndSendTransaction]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">Send Transaction (Devnet)</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          This sends a minimal transaction via the Memo program—useful for validating the paymaster and signing flow.
        </div>
      </div>

      <input
        className="h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none dark:border-zinc-700"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="memo message"
      />

      <button
        className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        onClick={handleSend}
        disabled={!msg || isConnecting || isSigning}
      >
        Send Memo Tx
      </button>

      {sig ? (
        <div className="break-all text-xs text-zinc-700 dark:text-zinc-300">
          <div className="font-medium">txSignature</div>
          <div>{sig}</div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {err}
        </div>
      ) : null}
    </div>
  );
}

