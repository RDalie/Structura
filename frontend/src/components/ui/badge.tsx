import { cn } from "../../lib/utils";
import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive";
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase";
  const variants: Record<typeof variant, string> = {
    default: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    secondary: "border-slate-400/30 bg-slate-500/15 text-slate-100",
    destructive: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  };
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
