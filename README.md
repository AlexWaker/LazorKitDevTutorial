# LazorKit Interactive Developer Tutorial (Next.js)

An **interactive LazorKit developer tutorial** built with **Next.js App Router**: a left-side table of contents, and on the right a per-feature walkthrough with **how it works / key copyable code / clickable demos**.

> LazorKit React SDK docs: `https://docs.lazorkit.com/react-sdk`

## What you can learn & try

- **Connect Wallet (Passkey)**: open the LazorKit portal to create/sign in (session restore supported)
- **Sign a Message (P-256)**: WebAuthn message signing (returns `signature` + `signedPayload`)
- **Send a Transaction (Devnet)**：
  - Minimal Memo transaction (validate signing + paymaster flow)
  - SOL transfer (user-input destination + SOL amount)
  - Devnet airdrop & balance display
- **Wallet Adapter Ecosystem Compatibility**: integrate Solana Wallet Adapter (LazorKit / Phantom / and browser-discovered Wallet Standard wallets)
- **Session & Multi-device Management**: browser-local session & device history, sign-out, clear cache (tutorial demo)
- **Troubleshooting & FAQ**: common issues (WebAuthn/TLS/proxy/popup/balance & paymaster)

## Tech stack

- **Next.js 16** (Turbopack, App Router)
- **React 19**
- **@lazorkit/wallet** (LazorKit React SDK)
- **@solana/web3.js**
- **@solana/wallet-adapter-\*** (ecosystem compatibility)
- **Tailwind CSS v4**

## Local development

This project uses pnpm. Use corepack to avoid PATH differences:

```bash
corepack pnpm install
corepack pnpm dev
```

Open: `http://localhost:3000`

Production build:

```bash
corepack pnpm build
corepack pnpm start
```

## Environment variables (optional)

Defaults to Devnet. Override via env vars (client-readable env vars must start with `NEXT_PUBLIC_`):

- **NEXT_PUBLIC_LAZORKIT_RPC_URL**
  - Default: `https://api.devnet.solana.com`
- **NEXT_PUBLIC_LAZORKIT_PORTAL_URL**
  - Default: `https://portal.lazor.sh`
- **NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL**
  - Default: `https://kora.devnet.lazorkit.com`
- **NEXT_PUBLIC_LAZORKIT_PAYMASTER_API_KEY** (optional)

## Project structure (key files)

- **Tutorial pages**
  - `app/page.tsx`: entry
  - `app/tutorial/TutorialPage.tsx`: table of contents + sections + copy
  - `app/tutorial/snippets.ts`: per-section key code (copyable)
  - `app/tutorial/CodeBlock.tsx` / `app/tutorial/Callout.tsx`: tutorial UI components
- **LazorKit integration**
  - `app/providers.tsx`: `LazorkitProvider` + Buffer polyfill + Wallet Adapter providers
- **Feature demos**
  - `app/lazorkit/demos/ConnectDemo.tsx`
  - `app/lazorkit/demos/SignMessageDemo.tsx`
  - `app/lazorkit/demos/SendTxDemo.tsx` (Memo + SOL transfer + airdrop + balance)
- **Ecosystem compatibility**
  - `app/solana/SolanaWalletAdapterProviders.tsx`
  - `app/solana/WalletAdapterPanel.tsx`
- **Debug / diagnostics**
  - `app/lazorkit/usePortalDebug.ts`: capture portal postMessage (to surface root-cause error details)

## Troubleshooting

### 1) After confirming the portal dialog, you see “Signing failed”

This is usually not an SDK usage issue. The browser is rejecting WebAuthn on the portal side. Common causes:

- **TLS certificate errors**
  - Often caused by proxies/VPNs/HTTPS inspection (local proxy, corporate gateway, debugging proxies).
  - Fix: disable proxy/VPN, try a different network, retry in Incognito, and open `https://portal.lazor.sh` directly to see if the browser shows a “not secure / certificate error” warning.

### 2) The portal popup does not open

- Your browser blocked popups: allow popups for the site.

### 3) “Gasless” ≠ “no balance needed”

- A paymaster typically sponsors transaction fees, but when you **transfer SOL**, the SOL comes from your smart wallet’s balance.
- On Devnet, use the airdrop button to fund the smart wallet first.

## Notes

- WebAuthn requires a secure context: `localhost` is OK for development; production must be HTTPS.
- If you have many wallet extensions installed, you may see unrelated console warnings (injection scripts, etc.). They typically do not affect LazorKit functionality.

## References

- LazorKit React SDK: `https://docs.lazorkit.com/react-sdk`
- LazorKit Troubleshooting: `https://docs.lazorkit.com/troubleshooting`
- Wallet Standard: `https://docs.lazorkit.com/wallet-standard`
