import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#6f7bff]/60 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed";
  const variants: Record<typeof variant, string> = {
    default: "bg-[#4f7cff] text-white hover:bg-[#3f6ef3] shadow-sm shadow-[#4f7cff]/30",
    outline: "border border-[#d0d7e2] bg-white text-[#0f172a] hover:border-[#9aa7c4] hover:bg-[#f4f6fb]",
    ghost: "text-[#0f172a] hover:bg-[#eef1f7]",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
