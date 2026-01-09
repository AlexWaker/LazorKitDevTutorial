"use client";

import { useEffect, useMemo, useState } from "react";
import CodeBlock from "./CodeBlock";
import { snippets } from "./snippets";
import Callout from "./Callout";
import ConnectDemo from "../lazorkit/demos/ConnectDemo";
import SignMessageDemo from "../lazorkit/demos/SignMessageDemo";
import SendTxDemo from "../lazorkit/demos/SendTxDemo";
import WalletAdapterPanel from "../solana/WalletAdapterPanel";
import DeviceManager from "../lazorkit/DeviceManager";

type Section = {
  id: string;
  title: string;
  description?: string;
  body?: React.ReactNode;
  code?: { title?: string; value: string };
  Demo?: React.ComponentType;
};

const sections: Section[] = [
  {
    id: "intro",
    title: "Introduction",
    description:
      "This is an interactive, tutorial-first experience: each section includes key code snippets plus clickable demos so you can learn by doing.",
    body: (
      <div className="space-y-4">
        <div className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
          LazorKit is a passkey-first smart wallet on Solana. The React SDK wraps
          the app with a provider and gives you a hook-based API:
          <span className="font-medium"> connect → signMessage → signAndSendTransaction</span>.
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Callout variant="info" title="Mental model">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                A <span className="font-medium">passkey</span> (WebAuthn) is used
                for authentication & signing — no seed phrase UI.
              </li>
              <li>
                A <span className="font-medium">smart wallet</span> is the on-chain
                account you interact with (e.g. it holds SOL).
              </li>
              <li>
                A <span className="font-medium">paymaster</span> can sponsor fees
                (gasless UX), but it does not magically fund transfers.
              </li>
            </ul>
          </Callout>

          <Callout variant="tip" title="Quick start">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Connect (create or restore a session).</li>
              <li>Request a Devnet airdrop to fund the smart wallet.</li>
              <li>Try message signing and then a memo tx / SOL transfer.</li>
            </ol>
          </Callout>
        </div>

        <Callout variant="warning" title="WebAuthn requirements">
          WebAuthn requires a secure context. <span className="font-medium">localhost</span>{" "}
          is OK for dev; production must be HTTPS. If the portal has TLS/cert
          issues (often due to proxies/VPNs), signing will fail. See{" "}
          <a
            className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            href="https://docs.lazorkit.com/troubleshooting"
          >
            Troubleshooting
          </a>
          .
        </Callout>
      </div>
    ),
    code: { title: "Why you need a Provider", value: snippets.provider },
  },
  {
    id: "connect",
    title: "Connect Wallet (Passkey)",
    description:
      "Clicking Connect opens the LazorKit portal to guide account creation/sign-in, and it will restore an existing session when available.",
    body: (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Callout variant="info" title="What this does">
            <ul className="list-disc space-y-1 pl-5">
              <li>Opens the LazorKit portal (popup or embedded dialog).</li>
              <li>Lets the user create a passkey or pick an existing one.</li>
              <li>Persists a session locally for future auto-reconnect.</li>
            </ul>
          </Callout>
          <Callout variant="info" title="How it works (high level)">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                The portal performs WebAuthn and returns a <span className="font-medium">credentialId</span>{" "}
                + passkey public key material.
              </li>
              <li>
                SDK maps the credential to a <span className="font-medium">smart wallet address</span> (create if needed).
              </li>
              <li>
                The app stores wallet/session info in local storage (for smooth UX).
              </li>
            </ul>
          </Callout>
        </div>

        <Callout variant="tip" title="Usage">
          Prefer calling <span className="font-mono">connect()</span> from a user
          gesture (button click). For most apps you’ll want{" "}
          <span className="font-mono">feeMode: "paymaster"</span> by default.
        </Callout>

        <Callout variant="warning" title="Common pitfalls">
          <ul className="list-disc space-y-1 pl-5">
            <li>Popup blocked by the browser — allow popups for the site.</li>
            <li>
              TLS/proxy issues for <span className="font-mono">portalUrl</span> —
              WebAuthn will fail if the portal has cert errors.
            </li>
            <li>SSR: wallet actions must run on the client (we use <span className="font-mono">"use client"</span>).</li>
          </ul>
        </Callout>
      </div>
    ),
    code: { title: "Key code: connect / disconnect", value: snippets.connect },
    Demo: ConnectDemo,
  },
  {
    id: "sign-message",
    title: "Sign a Message (P-256)",
    description:
      "WebAuthn typically returns signature + signedPayload; you need both for verification.",
    body: (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Callout variant="info" title="What this is for">
            <ul className="list-disc space-y-1 pl-5">
              <li>Prove account ownership without sending a transaction.</li>
              <li>Login with wallet (SIW-like) or bind an off-chain session.</li>
            </ul>
          </Callout>
          <Callout variant="info" title="Why signedPayload exists">
            In WebAuthn, the authenticator signs a browser-constructed payload
            (clientDataJSON + authenticatorData), not your raw string. That’s
            why you receive both <span className="font-mono">signature</span> and{" "}
            <span className="font-mono">signedPayload</span>.
          </Callout>
        </div>

        <Callout variant="tip" title="How to use">
          Treat the result as a tuple. When verifying on your backend, you must
          verify the signature against the exact signed bytes (the SDK helps by
          returning them).
        </Callout>

        <Callout variant="warning" title="Troubleshooting">
          If you see <span className="font-medium">Signing failed</span>, check the portal message
          details. TLS/cert errors (often from proxies) will break WebAuthn even
          if your app runs on localhost.
        </Callout>
      </div>
    ),
    code: { title: "Key code: signMessage()", value: snippets.signMessage },
    Demo: SignMessageDemo,
  },
  {
    id: "send-tx",
    title: "Send a Transaction (Devnet)",
    description:
      "Build a minimal Memo transaction to validate signAndSendTransaction and the paymaster flow.",
    body: (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Callout variant="info" title="What this does">
            <ul className="list-disc space-y-1 pl-5">
              <li>Builds instructions (Memo or SOL transfer).</li>
              <li>Asks the portal for a passkey signature.</li>
              <li>Sends via paymaster/bundler and returns a tx signature.</li>
            </ul>
          </Callout>
          <Callout variant="warning" title="Paymaster vs transfer amount">
            Paymaster can cover transaction fees, but{" "}
            <span className="font-medium">the SOL you send must come from your smart wallet balance</span>.
            Use the airdrop button on Devnet to fund it before transferring.
          </Callout>
        </div>

        <Callout variant="tip" title="Practical tips">
          <ul className="list-disc space-y-1 pl-5">
            <li>Start with Memo (no balance changes) to validate the signing pipeline.</li>
            <li>Then try SOL transfer with a small amount (e.g. 0.01 SOL).</li>
            <li>If a tx fails, raise compute units or check paymaster config.</li>
          </ul>
        </Callout>
      </div>
    ),
    code: { title: "Key code: signAndSendTransaction()", value: snippets.sendMemoTx },
    Demo: SendTxDemo,
  },
  {
    id: "wallet-adapter",
    title: "Wallet Adapter Ecosystem Compatibility",
    description:
      "Use the Wallet Adapter UI to list LazorKit, Phantom, and any browser-discovered Wallet Standard wallets side-by-side.",
    body: (
      <div className="space-y-4">
        <Callout variant="info" title="Why this matters">
          Many Solana dapps are built on Wallet Adapter. LazorKit supports{" "}
          <span className="font-medium">Wallet Standard</span>, so it can coexist
          with other wallets and appear in the same selector UI.
        </Callout>

        <Callout variant="tip" title="How it works">
          Wallet Adapter can automatically discover wallets that implement
          Wallet Standard (including some extensions). We additionally register
          LazorKit as a standard wallet on the client, then pass adapters into{" "}
          <span className="font-mono">WalletProvider</span>.
        </Callout>
      </div>
    ),
    code: { title: "Key code: registerLazorkitWallet + WalletProvider", value: snippets.walletAdapter },
    Demo: WalletAdapterPanel,
  },
  {
    id: "device-mgmt",
    title: "Session & Multi-device Management",
    description:
      "Shows passkeys/devices recorded by this browser; supports sign-out and clearing local cache, and provides an entry to add/link a new passkey.",
    body: (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Callout variant="info" title="What we show here">
            <ul className="list-disc space-y-1 pl-5">
              <li>Local session state (this browser).</li>
              <li>Credential IDs and device hints captured on connect.</li>
              <li>Multiple passkeys per smart wallet (local history).</li>
            </ul>
          </Callout>
          <Callout variant="warning" title="What this is NOT">
            This demo does not fetch an authoritative “all devices on all platforms” list.
            Remote device revocation requires server/portal or on-chain policy support.
          </Callout>
        </div>

        <Callout variant="tip" title="Recommended UX pattern">
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide “Sign out on this device” (disconnect).</li>
            <li>Provide “Clear local cache” for shared computers.</li>
            <li>Provide “Add a new passkey/device” to support multi-device onboarding.</li>
          </ul>
        </Callout>
      </div>
    ),
    code: { title: "Key code: sign out & clear cache", value: snippets.deviceMgmt },
    Demo: DeviceManager,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting & FAQ",
    description: "Common issues you’ll hit in real development, and how to debug quickly.",
    body: (
      <div className="space-y-4">
        <Callout variant="danger" title="Signing failed (TLS certificate errors)">
          If portal returns{" "}
          <span className="font-mono">WebAuthn is not supported on sites with TLS certificate errors</span>,
          you almost always have a proxy/VPN/HTTPS inspection in the middle. Disable the proxy (or use another network),
          then retry. This is a browser security policy.
        </Callout>

        <Callout variant="warning" title="Popup not opening">
          Allow popups for your site. Some browsers/extensions block portal popups.
        </Callout>

        <Callout variant="info" title="Balance confusion">
          “Gasless” usually means sponsored fees. It does not mean you can send SOL without having SOL in the smart wallet.
          Use Devnet airdrop for demos.
        </Callout>

        <div className="text-sm text-zinc-700 dark:text-zinc-200">
          More in the official docs:{" "}
          <a
            className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
            href="https://docs.lazorkit.com/troubleshooting"
          >
            Troubleshooting
          </a>
          .
        </div>
      </div>
    ),
  },
];

export default function TutorialPage() {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "intro");

  const items = useMemo(
    () => sections.map((s) => ({ id: s.id, title: s.title })),
    [],
  );

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65, 0.8] },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen font-sans text-zinc-950 dark:text-zinc-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#fbfbfc] dark:bg-[#050815]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_0%,rgba(99,102,241,0.20),transparent_55%),radial-gradient(900px_circle_at_85%_10%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(900px_circle_at_50%_120%,rgba(244,114,182,0.10),transparent_55%)] dark:bg-[radial-gradient(1200px_circle_at_15%_0%,rgba(99,102,241,0.26),transparent_60%),radial-gradient(900px_circle_at_85%_10%,rgba(16,185,129,0.20),transparent_60%),radial-gradient(900px_circle_at_50%_120%,rgba(244,114,182,0.14),transparent_60%)]" />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 md:grid-cols-[280px_1fr]">
        <aside className="sticky top-6 h-fit rounded-2xl border border-white/40 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
          <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Contents
          </div>
          <nav className="space-y-1">
            {items.map((it) => {
              const active = it.id === activeId;
              return (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className={[
                    "group block rounded-xl px-2.5 py-2 text-sm transition",
                    active
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-white/70 dark:text-zinc-200 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{it.title}</span>
                    <span
                      className={[
                        "text-[10px] opacity-0 transition group-hover:opacity-60",
                        active ? "opacity-80" : "",
                      ].join(" ")}
                    >
                      ⌁
                    </span>
                  </div>
                </a>
              );
            })}
          </nav>

          {/* <div className="mt-3 rounded-xl border border-zinc-200/60 bg-white/60 p-2 text-[11px] text-zinc-600 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            Tip: use <span className="font-medium">localhost</span> in development (WebAuthn requires a secure context). See{" "}
            <a
              className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
              href="https://docs.lazorkit.com/troubleshooting"
            >
              Troubleshooting
            </a>{" "}
            .
          </div> */}
        </aside>

        <main className="space-y-6">
          <header className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_10%_10%,rgba(99,102,241,0.12),transparent_55%)] dark:bg-[radial-gradient(600px_circle_at_10%_10%,rgba(99,102,241,0.16),transparent_55%)]" />
            <div className="relative space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-white/60 px-3 py-1 text-[11px] font-medium text-zinc-700 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                LazorKit · React SDK · Next.js
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                LazorKit Interactive Developer Tutorial
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Each section includes key code (copyable) and a clickable demo. Reference docs:
                <a
                  className="ml-1 font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300"
                  href="https://docs.lazorkit.com/react-sdk"
                >
                  https://docs.lazorkit.com/react-sdk
                </a>
              </p>
            </div>
          </header>

          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-6 space-y-4 rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold md:text-xl">{s.title}</h2>
                {s.description ? (
                  <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {s.description}
                  </p>
                ) : null}
              </div>

              {s.body ? (
                <div className="space-y-3">{s.body}</div>
              ) : null}

              {s.code ? <CodeBlock title={s.code.title} code={s.code.value} /> : null}

              {s.Demo ? (
                <div className="rounded-2xl border border-zinc-200/60 bg-gradient-to-b from-white/70 to-white/40 p-4 backdrop-blur dark:border-white/10 dark:from-white/5 dark:to-white/0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900">
                    Try it
                  </div>
                  <s.Demo />
                </div>
              ) : null}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

