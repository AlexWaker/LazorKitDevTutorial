"use client";

import type { ReactNode } from "react";

type Variant = "info" | "tip" | "warning" | "danger";

const stylesByVariant: Record<Variant, string> = {
  info: "border-sky-200/60 bg-sky-50/60 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100",
  tip: "border-emerald-200/60 bg-emerald-50/60 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
  warning:
    "border-amber-200/60 bg-amber-50/60 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
  danger:
    "border-rose-200/60 bg-rose-50/60 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100",
};

const labelByVariant: Record<Variant, string> = {
  info: "Info",
  tip: "Tip",
  warning: "Warning",
  danger: "Important",
};

export default function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: Variant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 text-sm leading-6 backdrop-blur",
        stylesByVariant[variant],
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
        <span className="rounded-full bg-white/40 px-2 py-0.5 dark:bg-white/10">
          {labelByVariant[variant]}
        </span>
        {title ? <span className="normal-case opacity-90">{title}</span> : null}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

