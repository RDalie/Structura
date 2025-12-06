import { cn } from '../../lib/utils';
import type { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'destructive';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase';
  const variants: Record<typeof variant, string> = {
    default: 'border-[#9fd8b4] bg-[#e7f5eb] text-[#1f4732]',
    secondary: 'border-[#cfd4de] bg-[#f3f4f8] text-[#2f2a1f]',
    destructive: 'border-[#f0b6b0] bg-[#fde8e7] text-[#7a1f1b]',
  };
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
