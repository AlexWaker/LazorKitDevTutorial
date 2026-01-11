"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  asCredentialHash,
  asPasskeyPublicKey,
  credentialHashFromBase64,
  DialogManager,
  getBlockchainTimestamp,
  LazorkitClient,
  Paymaster,
  SmartWalletAction,
  useWallet,
} from "@lazorkit/wallet";

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
    wallet,
  } = useWallet();
  const [msg, setMsg] = useState("Memo from LazorKit");
  const [sig, setSig] = useState<string | null>(null);
  const [airdropSig, setAirdropSig] = useState<string | null>(null);
  const [airdropBusy, setAirdropBusy] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferSol, setTransferSol] = useState("0.01");
  const [transferSig, setTransferSig] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rpcUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL ?? "https://api.devnet.solana.com";
  const portalUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL ?? "https://portal.lazor.sh";
  const paymasterUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL ??
    "https://kora.devnet.lazorkit.com";
  const paymasterApiKey = process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_API_KEY;

  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr] = useState<string | null>(null);

  const connection = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);

  const balanceSolText = useMemo(() => {
    if (balanceLamports == null) return "—";
    const sol = balanceLamports / LAMPORTS_PER_SOL;
    return sol.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }, [balanceLamports]);

  const refreshBalance = useCallback(async () => {
    if (!isConnected || !smartWalletPubkey) return;
    setBalanceErr(null);
    setBalanceLoading(true);
    try {
      const lamports = await connection.getBalance(smartWalletPubkey, "confirmed");
      setBalanceLamports(lamports);
    } catch (e) {
      setBalanceErr(e instanceof Error ? e.message : String(e));
      setBalanceLamports(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [connection, isConnected, smartWalletPubkey]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const handleSend = useCallback(async () => {
    setErr(null);
    setSig(null);
    setAirdropSig(null);
    setTransferSig(null);
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
        transactionOptions: { clusterSimulation: "devnet" },
      });
      setSig(s);
      void refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [
    connect,
    isConnected,
    msg,
    refreshBalance,
    signAndSendTransaction,
    smartWalletPubkey,
  ]);

  /**
   * NOTE: `useWallet().signAndSendTransaction()` currently does not pass `cpiSigners` into
   * LazorKit execution. Instructions that require a signer (e.g. SystemProgram.transfer)
   * will fail simulation with `MissingRequiredSignature` unless you explicitly provide CPI signers.
   */
  const signAndSendWithCpiSigners = useCallback(
    async (args: { instructions: TransactionInstruction[]; cpiSigners: PublicKey[] }) => {
      if (!wallet) throw new Error("No wallet connected.");
      if (!smartWalletPubkey) {
        throw new Error("Wallet is not ready yet. Please try again in a moment.");
      }

      const paymaster = new Paymaster({ paymasterUrl, apiKey: paymasterApiKey });
      const payer = await paymaster.getPayer();

      const lazorkit = new LazorkitClient(connection);
      const timestamp = await getBlockchainTimestamp(connection); // BN (seconds)
      const credentialHash = asCredentialHash(
        credentialHashFromBase64(wallet.credentialId),
      );
      const passkeyPublicKey = asPasskeyPublicKey(wallet.passkeyPubkey);

      const authMsg = await lazorkit.buildAuthorizationMessage({
        action: {
          type: SmartWalletAction.CreateChunk,
          args: {
            cpiInstructions: args.instructions,
            cpiSigners: args.cpiSigners,
          },
        },
        payer,
        smartWallet: smartWalletPubkey,
        passkeyPublicKey,
        credentialHash,
        timestamp,
      });

      const msgBase64Url = Buffer.from(authMsg)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

      const latest = await connection.getLatestBlockhash("confirmed");
      const messageV0 = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: latest.blockhash,
        instructions: args.instructions,
      }).compileToV0Message();
      const txToShow = new VersionedTransaction(messageV0);
      const txBase64 = Buffer.from(txToShow.serialize()).toString("base64");

      const dialog = new DialogManager({ portalUrl, rpcUrl, paymasterUrl });
      try {
        const signRes = await dialog.openSign(
          msgBase64Url,
          txBase64,
          wallet.credentialId,
          "devnet",
        );

        const createChunkTx = await lazorkit.createChunkTxn({
          payer,
          smartWallet: smartWalletPubkey,
          passkeySignature: {
            passkeyPublicKey,
            signature64: signRes.signature,
            clientDataJsonRaw64: signRes.clientDataJsonBase64,
            authenticatorDataRaw64: signRes.authenticatorDataBase64,
          },
          credentialHash,
          timestamp,
          cpiInstructions: args.instructions,
          cpiSigners: args.cpiSigners,
        });

        const chunkSig =
          "version" in createChunkTx
            ? await paymaster.signAndSendVersionedTransaction(createChunkTx)
            : await paymaster.signAndSend(createChunkTx);

        await connection.confirmTransaction(chunkSig, "confirmed");

        // Wait briefly for the chunk PDA to appear, then execute it.
        for (let attempt = 0; attempt < 3; attempt++) {
          const walletState = await lazorkit.getWalletStateData(smartWalletPubkey);
          const chunkPda = lazorkit.getChunkPubkey(smartWalletPubkey, walletState.lastNonce);
          const info = await connection.getAccountInfo(chunkPda, "confirmed");
          if (info) break;
          await new Promise((r) => setTimeout(r, 1500));
        }

        const execTx = await lazorkit.executeChunkTxn({
          payer,
          smartWallet: smartWalletPubkey,
          cpiInstructions: args.instructions,
          cpiSigners: args.cpiSigners,
        });

        const execSig =
          "version" in execTx
            ? await paymaster.signAndSendVersionedTransaction(execTx)
            : await paymaster.signAndSend(execTx);

        return execSig;
      } finally {
        dialog.destroy();
      }
    },
    [
      connection,
      paymasterApiKey,
      paymasterUrl,
      portalUrl,
      rpcUrl,
      smartWalletPubkey,
      wallet,
    ],
  );

  const handleTransfer = useCallback(async () => {
    setErr(null);
    setTransferSig(null);
    setSig(null);
    setAirdropSig(null);
    try {
      if (!isConnected) await connect({ feeMode: "paymaster" });
      if (!smartWalletPubkey) {
        throw new Error("Wallet is not ready yet. Please try again in a moment.");
      }
      const to = (() => {
        try {
          return new PublicKey(transferTo.trim());
        } catch {
          throw new Error("Invalid destination address.");
        }
      })();
      const amount = Number(transferSol);
      if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Invalid SOL amount.");
      }
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      if (!Number.isSafeInteger(lamports) || lamports <= 0) {
        throw new Error("Amount is too large or invalid (lamports overflow).");
      }

      // Preflight checks for better error messages.
      // - Recipient must exist on-chain for a SOL transfer on Solana.
      // - Paymaster may cover fees, but not the SOL you transfer.
      const [toInfo, fromBalance] = await Promise.all([
        connection.getAccountInfo(to, "confirmed"),
        connection.getBalance(smartWalletPubkey, "confirmed"),
      ]);

      setBalanceLamports(fromBalance);

      if (!toInfo) {
        throw new Error(
          "Recipient account does not exist on Devnet yet. Ask the recipient to create/fund the account first (e.g. request an airdrop to that address) and try again.",
        );
      }

      if (lamports > fromBalance) {
        throw new Error(
          `Insufficient SOL balance in your smart wallet. Balance: ${(
            fromBalance / LAMPORTS_PER_SOL
          ).toFixed(4)} SOL, requested: ${amount} SOL.`,
        );
      }

      const ix = SystemProgram.transfer({
        fromPubkey: smartWalletPubkey,
        toPubkey: to,
        lamports,
      });

      const s = await signAndSendWithCpiSigners({
        instructions: [ix],
        cpiSigners: [smartWalletPubkey],
      });
      setTransferSig(s);
      void refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [
    connect,
    isConnected,
    refreshBalance,
    signAndSendWithCpiSigners,
    smartWalletPubkey,
    transferSol,
    transferTo,
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
      await refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
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
              onClick={refreshBalance}
              disabled={!isConnected || !smartWalletPubkey || balanceLoading || isConnecting || isSigning}
              title="Refresh balance"
            >
              {balanceLoading ? "Refreshing…" : "Refresh"}
            </button>

            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[12px] font-semibold text-white dark:bg-white dark:text-zinc-900">
              <span className="opacity-80">SOL</span>
              <span>{balanceSolText}</span>
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

      <div className="mt-2 space-y-2">
        <div className="text-sm font-medium">Transfer SOL</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Note: the paymaster covers fees, but <span className="font-medium">the SOL you send must come from your smart wallet balance</span>.
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px]">
          <input
            className="h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none dark:border-zinc-700"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            placeholder="destination address (base58)"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            className="h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-sm outline-none dark:border-zinc-700"
            value={transferSol}
            onChange={(e) => setTransferSol(e.target.value)}
            placeholder="SOL"
            inputMode="decimal"
          />
        </div>
        <button
          className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          onClick={handleTransfer}
          disabled={!transferTo.trim() || !transferSol.trim() || isConnecting || isSigning}
        >
          Send SOL
        </button>
        {transferSig ? (
          <div className="break-all text-xs text-zinc-700 dark:text-zinc-300">
            <div className="font-medium">transferSignature</div>
            <div>{transferSig}</div>
            <a
              className="mt-1 inline-block text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
              href={`https://explorer.solana.com/tx/${transferSig}?cluster=devnet`}
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
            href={`https://explorer.solana.com/tx/${airdropSig}?cluster=devnet`}
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

