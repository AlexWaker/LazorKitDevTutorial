"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Buffer } from "buffer";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { useWallet } from "@lazorkit/wallet";
import {
  buildUsdcTransferInstructions,
  getUsdcBalance,
  getAssociatedTokenAddressSync,
  inferClusterFromRpcUrl,
  DEFAULT_USDC_MINT,
  TOKEN_PROGRAM_ID,
  validateRecipientAddress,
  validateTransferAmount,
  withRetry,
} from "@/app/solana/solana-utils";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

function shortBase58(value: string, head = 6, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function SendTxDemo() {
  const {
    connect,
    isConnected,
    isConnecting,
    isSigning,
    signAndSendTransaction,
    smartWalletPubkey,
  } = useWallet();
  const [msg, setMsg] = useState("Memo from LazorKit");
  const [sig, setSig] = useState<string | null>(null);
  const [airdropSig, setAirdropSig] = useState<string | null>(null);
  const [airdropBusy, setAirdropBusy] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [retryCount, setRetryCount] = useState(0);
  const [transferSig, setTransferSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rpcUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL ?? "https://api.devnet.solana.com";

  const clusterSimulation =
    (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as "devnet" | "mainnet" | undefined) ??
    inferClusterFromRpcUrl(rpcUrl);

  const explorerClusterParam =
    clusterSimulation === "mainnet" ? "mainnet-beta" : "devnet";

  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr] = useState<string | null>(null);

  const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);
  const smartWalletBase58 = useMemo(
    () => smartWalletPubkey?.toBase58() ?? null,
    [smartWalletPubkey],
  );

  const usdcBalanceText = useMemo(() => {
    if (usdcBalance == null) return "—";
    return usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }, [usdcBalance]);

  const lastRefreshAtMsRef = useRef<number>(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshBalance = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force ?? false;
    if (!isConnected || !smartWalletBase58) return;
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }

    const now = Date.now();
    if (!force && now - lastRefreshAtMsRef.current < 3000) {
      return;
    }
    lastRefreshAtMsRef.current = now;

    setBalanceErr(null);
    setBalanceLoading(true);
    const p = (async () => {
      try {
        const owner = new PublicKey(smartWalletBase58);
        const b = await getUsdcBalance(connection, owner);
        setUsdcBalance(b);
      } catch (e) {
        setBalanceErr(e instanceof Error ? e.message : String(e));
        setUsdcBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    })();

    refreshInFlightRef.current = p;
    try {
      await p;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [connection, isConnected, smartWalletBase58]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const handleSend = useCallback(async () => {
    setErr(null);
    setSig(null);
    setAirdropSig(null);
    setTransferSig(null);
    setRetryCount(0);
    try {
      if (!isConnected) await connect({ feeMode: "paymaster" });
      if (!smartWalletPubkey) {
        throw new Error("Wallet is not ready yet. Please try again in a moment.");
      }
      const ix = new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        // LazorKit SDK validates that each instruction has at least 1 account key.
        // Memo program does not require accounts, so we attach the smart wallet as a readonly meta.
        keys: [{ pubkey: smartWalletPubkey, isSigner: false, isWritable: false }],
        data: Buffer.from(msg, "utf8"),
      });
      const s = await signAndSendTransaction({
        instructions: [ix],
        transactionOptions: { clusterSimulation },
      });
      setSig(s);
      void refreshBalance({ force: true });
    } catch (e) {
      const anyErr = e as unknown as { message?: string; logs?: string[] };
      const baseMsg = e instanceof Error ? e.message : String(e);
      const logsText =
        anyErr && Array.isArray(anyErr.logs) && anyErr.logs.length
          ? `\n\nProgram logs:\n${anyErr.logs.join("\n")}`
          : "";
      setErr(`${baseMsg}${logsText}`);
    }
  }, [
    connect,
    isConnected,
    msg,
    refreshBalance,
    signAndSendTransaction,
    smartWalletPubkey,
  ]);

  const handleTransferUsdc = useCallback(async () => {
    setErr(null);
    setTransferSig(null);
    setSig(null);
    setAirdropSig(null);
    setRetryCount(0);
    try {
      if (!isConnected) await connect({ feeMode: "paymaster" });
      if (!smartWalletPubkey) {
        throw new Error("Wallet is not ready yet. Please try again in a moment.");
      }

      // Ensure balance is loaded; otherwise we might send with an unknown balance and hit a vague SPL error.
      if (usdcBalance == null) {
        await refreshBalance({ force: true });
        throw new Error("USDC balance is not loaded yet. Please refresh and try again.");
      }

      const recipientValidation = validateRecipientAddress(recipient);
      if (!recipientValidation.valid || !recipientValidation.address) {
        throw new Error(recipientValidation.error ?? "Invalid recipient address.");
      }

      // Ensure sender has a USDC token account (ATA). If not, the transfer will fail with a vague SPL error.
      const senderAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        smartWalletPubkey,
      );
      const senderAtaInfo = await connection.getAccountInfo(senderAta, "confirmed");
      if (!senderAtaInfo) {
        throw new Error(
          "Your USDC token account (ATA) does not exist yet. Please receive/airdrop/transfer some USDC to this Smart Wallet address first (it will create the ATA automatically), then try again.",
        );
      }
      if (!senderAtaInfo.owner.equals(TOKEN_PROGRAM_ID)) {
        throw new Error(
          [
            "Sender USDC ATA exists, but the account is not owned by the SPL Token Program.",
            `ATA: ${senderAta.toBase58()}`,
            `owner(programId): ${senderAtaInfo.owner.toBase58()}`,
            "This usually means your USDC mint / cluster config is mismatched, or the address is not a token account on this cluster.",
          ].join("\n"),
        );
      }

      // Preflight: determine whether we will need to CREATE the recipient ATA (rent needed).
      const recipientAta = getAssociatedTokenAddressSync(
        DEFAULT_USDC_MINT,
        recipientValidation.address,
      );
      const recipientAtaInfo = await connection.getAccountInfo(
        recipientAta,
        "confirmed",
      );

      const amountValidation = validateTransferAmount(amount, usdcBalance);
      if (!amountValidation.valid || amountValidation.amountNum == null) {
        throw new Error(amountValidation.error ?? "Invalid transfer amount.");
      }

      // Preflight: verify token balance using RPC's token-account balance API (more precise than our byte parsing).
      const rawToSend = BigInt(Math.floor(amountValidation.amountNum * 1_000_000));
      let rawHave: bigint | null = null;
      try {
        const bal = await connection.getTokenAccountBalance(senderAta, "confirmed");
        rawHave = BigInt(bal.value.amount);
      } catch (e) {
        // If the RPC can't read token balance, we still proceed; LazorKit simulation will catch it.
        console.warn("Failed to fetch token account balance for preflight", e);
      }
      if (rawHave != null && rawHave < rawToSend) {
        throw new Error(
          `Insufficient USDC balance: you have ${(Number(rawHave) / 1_000_000).toFixed(6)}, need ${amountValidation.amountNum} USDC.`,
        );
      }

      // If recipient ATA is missing, creating it costs rent (lamports) paid by the payer in the ATA-create instruction.
      // Paymaster covers fees, but rent may still require SOL in the smart wallet.
      if (!recipientAtaInfo) {
        const [senderSolLamports, rentLamports] = await Promise.all([
          connection.getBalance(smartWalletPubkey, "confirmed"),
          // SPL token account size is 165 bytes; rent-exempt amount varies by cluster.
          connection.getMinimumBalanceForRentExemption(165),
        ]);

        if (senderSolLamports < rentLamports) {
          throw new Error(
            [
              "Recipient USDC token account (ATA) does not exist yet and must be created (this requires a small SOL rent deposit).",
              `Your Smart Wallet SOL balance is not enough to cover rent: need ~${(rentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL.`,
              "How to fix:",
              "- Ask the recipient to receive/airdrop/transfer USDC once on this cluster (it will create the ATA), then retry; or",
              "- Add a small amount of SOL to your Smart Wallet (rent only; paymaster still covers fees).",
            ].join("\n"),
          );
        }
      }

      const sigResult = await withRetry(
        async () => {
          const instructions = await buildUsdcTransferInstructions({
            connection,
            sender: smartWalletPubkey,
            recipient: recipientValidation.address!,
            amountUsdc: amountValidation.amountNum!,
          });

          // If the recipient ATA doesn't exist, `instructions` will include:
          // 0) create ATA (can be rent-heavy and adds bytes)
          // 1) transfer
          // Sending them as 2 separate txs avoids Solana's max tx size (1232 bytes) edge cases.
          if (instructions.length >= 2) {
            const [createAtaIx, transferIx] = instructions;

            const createSig = await signAndSendTransaction({
              instructions: [createAtaIx],
              transactionOptions: { clusterSimulation },
            });
            await connection.confirmTransaction(createSig, "confirmed");

            const transferSig = await signAndSendTransaction({
              instructions: [transferIx],
              transactionOptions: { clusterSimulation },
            });
            await connection.confirmTransaction(transferSig, "confirmed");
            return transferSig;
          }

          const s = await signAndSendTransaction({
            instructions,
            // Let LazorKit/paymaster handle compute budget; adding a compute budget ix can increase tx size.
            transactionOptions: { clusterSimulation },
          });
          await connection.confirmTransaction(s, "confirmed");
          return s;
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt} after error:`, error);
            setRetryCount(attempt);
          },
        },
      );

      setTransferSig(sigResult);
      await refreshBalance({ force: true });
    } catch (e) {
      const anyErr = e as unknown as { message?: string; logs?: string[] };
      const baseMsg = e instanceof Error ? e.message : String(e);
      const logsText =
        anyErr && Array.isArray(anyErr.logs) && anyErr.logs.length
          ? `\n\nProgram logs:\n${anyErr.logs.join("\n")}`
          : "";
      setErr(`${baseMsg}${logsText}`);
    }
  }, [
    connect,
    amount,
    clusterSimulation,
    connection,
    isConnected,
    recipient,
    refreshBalance,
    smartWalletPubkey,
    signAndSendTransaction,
    usdcBalance,
  ]);

  const handleAirdrop = useCallback(async () => {
    setErr(null);
    setAirdropSig(null);
    setSig(null);
    setTransferSig(null);
    setAirdropBusy(true);
    try {
      if (!isConnected) {
        throw new Error("Please connect your wallet first, then request a Devnet airdrop.");
      }
      if (!smartWalletPubkey) {
        throw new Error("Wallet is not ready yet. Please try again in a moment.");
      }

      const latest = await connection.getLatestBlockhash("confirmed");
      const s = await connection.requestAirdrop(
        smartWalletPubkey,
        1 * LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(
        { signature: s, ...latest },
        "confirmed",
      );
      setAirdropSig(s);
      await refreshBalance({ force: true });
    } catch (e) {
      const anyErr = e as unknown as { message?: string; logs?: string[] };
      const baseMsg = e instanceof Error ? e.message : String(e);
      const logsText =
        anyErr && Array.isArray(anyErr.logs) && anyErr.logs.length
          ? `\n\nProgram logs:\n${anyErr.logs.join("\n")}`
          : "";
      setErr(`${baseMsg}${logsText}`);
    } finally {
      setAirdropBusy(false);
    }
  }, [connection, isConnected, refreshBalance, smartWalletPubkey]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">Send Transaction (Devnet)</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          This sends a minimal transaction via the Memo program—useful for validating the paymaster and signing flow.
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200/70 bg-white/40 p-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-[180px] truncate">
            <span className="text-zinc-500 dark:text-zinc-400">Destination</span>{" "}
            <span className="font-medium">
              {smartWalletPubkey ? shortBase58(smartWalletPubkey.toBase58()) : "—"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="h-8 rounded-lg border border-zinc-300 px-2 text-[12px] font-medium text-zinc-800 hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-white/10"
              onClick={() => void refreshBalance({ force: true })}
              disabled={!isConnected || !smartWalletPubkey || balanceLoading || isConnecting || isSigning}
              title="Refresh balance"
            >
              {balanceLoading ? "Refreshing…" : "Refresh"}
            </button>

            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[12px] font-semibold text-white dark:bg-white dark:text-zinc-900">
              <span className="opacity-80">USDC</span>
              <span>{usdcBalanceText}</span>
            </div>

            <button
              className={[
                "h-8 rounded-lg px-3 text-[12px] font-semibold text-white shadow-sm",
                "bg-gradient-to-r from-indigo-500 to-cyan-500",
                "hover:from-indigo-400 hover:to-cyan-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.10)]",
              ].join(" ")}
              onClick={handleAirdrop}
              disabled={!isConnected || !smartWalletPubkey || airdropBusy || isConnecting || isSigning}
            >
              {airdropBusy ? "Requesting…" : "Request 1 SOL Airdrop"}
            </button>
          </div>
        </div>

        {balanceErr ? (
          <div className="mt-2 text-[11px] text-red-700/90 dark:text-red-200/80">
            Balance error: {balanceErr}
          </div>
        ) : null}
      </div>

      {/* <input
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
      </button> */}

      {sig ? (
        <div className="break-all text-xs text-zinc-700 dark:text-zinc-300">
          <div className="font-medium">txSignature</div>
          <div>{sig}</div>
        </div>
      ) : null}

      <div className="mt-2 space-y-2">
        <div className="text-sm font-medium">Gasless USDC Transfer</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Paymaster covers fees. You need <span className="font-medium">USDC</span> balance; and if the recipient has no USDC token account yet, you may also need a tiny amount of{" "}
          <span className="font-medium">SOL</span> for rent.
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px]">
          <input
            className="h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none dark:border-zinc-700"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="destination address (base58)"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            className="h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none dark:border-zinc-700"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="USDC"
            inputMode="decimal"
          />
        </div>
        <button
          className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          onClick={handleTransferUsdc}
          disabled={
            !recipient.trim() ||
            !amount.trim() ||
            isConnecting ||
            isSigning ||
            balanceLoading ||
            usdcBalance == null
          }
        >
          {retryCount > 0 ? `Retrying... (${retryCount}/3)` : "Send USDC (Gasless)"}
        </button>
        {usdcBalance == null ? (
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            USDC balance is not loaded. Please connect and click Refresh above.
          </div>
        ) : null}
        {transferSig ? (
          <div className="break-all text-xs text-zinc-700 dark:text-zinc-300">
            <div className="font-medium">transferSignature</div>
            <div>{transferSig}</div>
            <a
              className="mt-1 inline-block text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
              href={`https://explorer.solana.com/tx/${transferSig}?cluster=${explorerClusterParam}`}
              target="_blank"
              rel="noreferrer"
            >
              View on Explorer
            </a>
          </div>
        ) : null}
      </div>

      {airdropSig ? (
        <div className="break-all text-xs text-zinc-700 dark:text-zinc-300">
          <div className="font-medium">airdropSignature</div>
          <div>{airdropSig}</div>
          <a
            className="mt-1 inline-block text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            href={`https://explorer.solana.com/tx/${airdropSig}?cluster=${explorerClusterParam}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Explorer
          </a>
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

