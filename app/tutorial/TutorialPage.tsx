"use client";

import { useEffect, useMemo, useState } from "react";
import CodeBlock from "./CodeBlock";
import { snippets } from "./snippets";
import ConnectDemo from "../lazorkit/demos/ConnectDemo";
import SignMessageDemo from "../lazorkit/demos/SignMessageDemo";
import SendTxDemo from "../lazorkit/demos/SendTxDemo";
import WalletAdapterPanel from "../solana/WalletAdapterPanel";
import DeviceManager from "../lazorkit/DeviceManager";

type Section = {
  id: string;
  title: string;
  description?: string;
  code?: { title?: string; value: string };
  Demo?: React.ComponentType;
};

const sections: Section[] = [
  {
    id: "intro",
    title: "Introduction",
    description:
      "This is an interactive, tutorial-first experience: each section includes key code snippets plus clickable demos so you can learn by doing.",
    code: { title: "Why you need a Provider", value: snippets.provider },
  },
  {
    id: "connect",
    title: "Connect Wallet (Passkey)",
    description:
      "Clicking Connect opens the LazorKit portal to guide account creation/sign-in, and it will restore an existing session when available.",
    code: { title: "Key code: connect / disconnect", value: snippets.connect },
    Demo: ConnectDemo,
  },
  {
    id: "sign-message",
    title: "Sign a Message (P-256)",
    description:
      "WebAuthn typically returns signature + signedPayload; you need both for verification.",
    code: { title: "Key code: signMessage()", value: snippets.signMessage },
    Demo: SignMessageDemo,
  },
  {
    id: "send-tx",
    title: "Send a Transaction (Devnet)",
    description:
      "Build a minimal Memo transaction to validate signAndSendTransaction and the paymaster flow.",
    code: { title: "Key code: signAndSendTransaction()", value: snippets.sendMemoTx },
    Demo: SendTxDemo,
  },
  {
    id: "wallet-adapter",
    title: "Wallet Adapter Ecosystem Compatibility",
    description:
      "Use the Wallet Adapter UI to list LazorKit, Phantom, and any browser-discovered Wallet Standard wallets side-by-side.",
    code: { title: "Key code: registerLazorkitWallet + WalletProvider", value: snippets.walletAdapter },
    Demo: WalletAdapterPanel,
  },
  {
    id: "device-mgmt",
    title: "Session & Multi-device Management",
    description:
      "Shows passkeys/devices recorded by this browser; supports sign-out and clearing local cache, and provides an entry to add/link a new passkey.",
    code: { title: "Key code: sign out & clear cache", value: snippets.deviceMgmt },
    Demo: DeviceManager,
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
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-black" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_15%_0%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(900px_circle_at_85%_10%,rgba(16,185,129,0.14),transparent_45%)] dark:bg-[radial-gradient(1200px_circle_at_15%_0%,rgba(99,102,241,0.20),transparent_45%),radial-gradient(900px_circle_at_85%_10%,rgba(16,185,129,0.16),transparent_45%)]" />

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

