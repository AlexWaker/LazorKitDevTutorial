"use client";

import React, { useEffect, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  DEFAULT_CONFIG,
  LazorkitWalletAdapter,
  registerLazorkitWallet,
} from "@lazorkit/wallet";

type Props = {
  children: React.ReactNode;
  rpcUrl: string;
  portalUrl: string;
  paymasterUrl: string;
  paymasterApiKey?: string;
};

export default function SolanaWalletAdapterProviders({
  children,
  rpcUrl,
  portalUrl,
  paymasterUrl,
  paymasterApiKey,
}: Props) {
  const lazorConfig = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      rpcUrl,
      portalUrl,
      paymasterConfig: {
        paymasterUrl,
        ...(paymasterApiKey ? { apiKey: paymasterApiKey } : null),
      },
      // Keep devnet simulation to match our default config; can be overridden via env later.
      clusterSimulation: "devnet" as const,
    }),
    [paymasterApiKey, paymasterUrl, portalUrl, rpcUrl],
  );

  useEffect(() => {
    // Wallet Standard relies on `window`, so register on client only.
    registerLazorkitWallet(lazorConfig);
  }, [lazorConfig]);

  const wallets = useMemo(() => {
    return [
      // LazorKit (Wallet Standard / adapter)
      new LazorkitWalletAdapter(lazorConfig),
      // Popular standard wallets for comparison
      new PhantomWalletAdapter(),
    ];
  }, [lazorConfig]);

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}


