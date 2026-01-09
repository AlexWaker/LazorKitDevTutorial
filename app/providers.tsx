"use client";

import React, { useEffect } from "react";
import { Buffer } from "buffer";
import { LazorkitProvider } from "@lazorkit/wallet";
import SolanaWalletAdapterProviders from "./solana/SolanaWalletAdapterProviders";

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  // LazorKit SDK relies on Node globals like Buffer in some bundlers.
  // Next.js usually handles a lot of this, but we keep this as a safe polyfill per docs.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Buffer ??= Buffer;
  }, []);

  const rpcUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_RPC_URL ?? "https://api.devnet.solana.com";
  const portalUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL ?? "https://portal.lazor.sh";
  const paymasterUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL ??
    "https://kora.devnet.lazorkit.com";
  const paymasterApiKey = process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_API_KEY;

  return (
    <SolanaWalletAdapterProviders
      rpcUrl={rpcUrl}
      portalUrl={portalUrl}
      paymasterUrl={paymasterUrl}
      paymasterApiKey={paymasterApiKey}
    >
      <LazorkitProvider
        rpcUrl={rpcUrl}
        portalUrl={portalUrl}
        paymasterConfig={{ paymasterUrl, apiKey: paymasterApiKey }}
      >
        {children}
      </LazorkitProvider>
    </SolanaWalletAdapterProviders>
  );
}


