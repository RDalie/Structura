import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants: Record<typeof variant, string> = {
    default: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    outline: "border border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500 hover:bg-slate-800",
    ghost: "text-slate-200 hover:bg-slate-800/70",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
