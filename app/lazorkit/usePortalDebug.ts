"use client";

import { useEffect, useState } from "react";

type PortalMsg =
  | { type: string; data?: unknown; error?: unknown; details?: unknown }
  | unknown;

export function useLazorkitPortalLastMessage(portalUrl: string) {
  const [last, setLast] = useState<{
    origin: string;
    data: PortalMsg;
    at: number;
  } | null>(null);

  useEffect(() => {
    let portalHost: string | null = null;
    try {
      portalHost = new URL(portalUrl).host;
    } catch {
      portalHost = null;
    }

    const onMessage = (ev: MessageEvent) => {
      try {
        if (!portalHost) return;
        if (typeof ev.origin !== "string") return;
        const host = new URL(ev.origin).host;
        if (host !== portalHost) return;
        setLast({ origin: ev.origin, data: ev.data as PortalMsg, at: Date.now() });
      } catch {
        // ignore
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [portalUrl]);

  return last;
}

