"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@lazorkit/wallet";
import { useLazorkitPortalLastMessage } from "../usePortalDebug";

function formatError(e: unknown) {
  if (e instanceof Error) {
    const anyErr = e as Error & { cause?: unknown };
    return {
      name: e.name,
      message: e.message,
      stack: e.stack ?? null,
      cause:
        anyErr.cause instanceof Error
          ? { name: anyErr.cause.name, message: anyErr.cause.message, stack: anyErr.cause.stack ?? null }
          : anyErr.cause ?? null,
    };
  }
  return { name: "NonError", message: String(e), stack: null, cause: null };
}

export default function SignMessageDemo() {
  const { connect, isConnected, isConnecting, isSigning, signMessage } =
    useWallet();
  const portalUrl =
    process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL ?? "https://portal.lazor.sh";
  const lastPortalMsg = useLazorkitPortalLastMessage(portalUrl);
  const [msg, setMsg] = useState("Hello from LazorKit");
  const [signature, setSignature] = useState<string | null>(null);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);
  const [err, setErr] = useState<ReturnType<typeof formatError> | null>(null);

  const handleSign = useCallback(async () => {
    setErr(null);
    setSignature(null);
    setSignedPayload(null);
    try {
      if (!isConnected) await connect({ feeMode: "paymaster" });
      const res = await signMessage(msg);
      setSignature(res.signature);
      setSignedPayload(res.signedPayload);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("LazorKit signMessage failed", e, {
        origin: typeof window !== "undefined" ? window.location.origin : null,
        isSecureContext: typeof window !== "undefined" ? window.isSecureContext : null,
      });
      setErr(formatError(e));
    }
  }, [connect, isConnected, msg, signMessage]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium">Message Signing (Passkey / P-256)</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Returns signature + signedPayload (you need both for verification).
        </div>
      </div>

      <textarea
        className="min-h-20 w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-2 text-sm outline-none dark:border-zinc-700"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
      />

      <button
        className="h-9 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        onClick={handleSign}
        disabled={!msg || isConnecting || isSigning}
      >
        Sign Message
      </button>

      {signature ? (
        <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="break-all">
            <div className="font-medium">signature</div>
            <div>{signature}</div>
          </div>
          {signedPayload ? (
            <div className="break-all">
              <div className="font-medium">signedPayload</div>
              <div>{signedPayload}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <div className="font-medium">Signing failed (details)</div>
          <div className="mt-2 space-y-1">
            <div>
              <span className="font-medium">name:</span>
              {err.name}
            </div>
            <div className="break-words">
              <span className="font-medium">message:</span>
              {err.message}
            </div>
            {err.cause ? (
              <div className="break-words">
                <span className="font-medium">cause:</span>
                {typeof err.cause === "string"
                  ? err.cause
                  : JSON.stringify(err.cause)}
              </div>
            ) : null}
            {err.stack ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">stack</summary>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-4">
                  {err.stack}
                </pre>
              </details>
            ) : null}
            <div className="mt-2 text-[11px] text-red-700/80 dark:text-red-200/80">
              Environment: {typeof window !== "undefined" ? window.location.origin : "—"} ·{" "}
              isSecureContext={typeof window !== "undefined" ? String(window.isSecureContext) : "—"}
            </div>
            {lastPortalMsg ? (
              <div className="mt-2 rounded-md border border-red-300/60 bg-white/40 p-2 text-[11px] text-red-900 dark:border-red-900/60 dark:bg-black/20 dark:text-red-200">
                <div className="font-medium">
                  Portal response (latest): {new Date(lastPortalMsg.at).toLocaleTimeString()}
                </div>
                <div className="mt-1 break-words">
                  origin: {lastPortalMsg.origin}
                </div>
                <div className="mt-1 break-words">
                  data: {typeof lastPortalMsg.data === "string" ? lastPortalMsg.data : JSON.stringify(lastPortalMsg.data)}
                </div>
                <div className="mt-2">
                  Tip: open{" "}
                  <a className="underline" href={portalUrl} target="_blank" rel="noreferrer">
                    {portalUrl}
                  </a>{" "}
                  in a new tab and check whether your browser shows a “connection not secure / certificate error” warning.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

