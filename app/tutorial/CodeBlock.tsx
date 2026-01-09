"use client";

import { useState } from "react";

type Props = {
  title?: string;
  code: string;
};

export default function CodeBlock({ title, code }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-zinc-950 shadow-sm ring-1 ring-white/10 dark:border-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="text-xs font-medium text-zinc-200">
            {title ?? "Key code"}
          </div>
        </div>
        <button
          className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 900);
          }}
          disabled={!code}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-5 text-zinc-100">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

