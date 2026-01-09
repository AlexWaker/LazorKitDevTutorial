export const snippets = {
  provider: `// app/providers.tsx
"use client";

import React, { useEffect } from "react";
import { Buffer } from "buffer";
import { LazorkitProvider } from "@lazorkit/wallet";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (globalThis as any).Buffer ??= Buffer;
  }, []);

  return (
    <LazorkitProvider
      rpcUrl={process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL ?? "https://api.devnet.solana.com"}
      portalUrl={process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL ?? "https://portal.lazor.sh"}
      paymasterConfig={{ paymasterUrl: process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL ?? "https://kora.devnet.lazorkit.com" }}
    >
      {children}
    </LazorkitProvider>
  );
}`,

  connect: `import { useWallet } from "@lazorkit/wallet";

export function ConnectButton() {
  const { connect, disconnect, isConnected } = useWallet();
  return isConnected ? (
    <button onClick={() => disconnect()}>Disconnect</button>
  ) : (
    <button onClick={() => connect({ feeMode: "paymaster" })}>Connect</button>
  );
}`,

  signMessage: `import { useWallet } from "@lazorkit/wallet";

export async function signDemoMessage(message: string) {
  const { connect, isConnected, signMessage } = useWallet();
  if (!isConnected) await connect({ feeMode: "paymaster" });
  const { signature, signedPayload } = await signMessage(message);
  return { signature, signedPayload };
}`,

  sendMemoTx: `import { useWallet } from "@lazorkit/wallet";
import { PublicKey, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Buffer } from "buffer";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export async function sendMemo(message: string) {
  const { connect, isConnected, signAndSendTransaction } = useWallet();
  if (!isConnected) await connect({ feeMode: "paymaster" });

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(message, "utf8"),
  });

  return await signAndSendTransaction({
    instructions: [ix],
    transactionOptions: { clusterSimulation: "devnet" },
  });
}

export async function transferSol(toBase58: string, amountSol: number) {
  const { connect, isConnected, smartWalletPubkey, signAndSendTransaction } = useWallet();
  if (!isConnected) await connect({ feeMode: "paymaster" });
  if (!smartWalletPubkey) throw new Error("Wallet not ready");

  const to = new PublicKey(toBase58);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  // Note: paymaster covers fees, but the SOL you send comes from the smart wallet balance.
  const ix = SystemProgram.transfer({
    fromPubkey: smartWalletPubkey,
    toPubkey: to,
    lamports,
  });

  return await signAndSendTransaction({
    instructions: [ix],
    transactionOptions: { clusterSimulation: "devnet" },
  });
}`,

  walletAdapter: `import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { DEFAULT_CONFIG, LazorkitWalletAdapter, registerLazorkitWallet } from "@lazorkit/wallet";

// Call on the client: registerLazorkitWallet(config)
// The wallets list should include the LazorKit adapter + Phantom (and any browser-discovered Wallet Standard wallets)
`,

  deviceMgmt: `import { StorageManager, StorageUtil } from "@lazorkit/wallet";

// Sign out: disconnect()
// Clear local cache (session / credentials):
await StorageManager.clearWallet();
StorageUtil.clearCredentials();`,
} as const;

