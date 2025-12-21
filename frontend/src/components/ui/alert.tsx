import { cn } from '../../lib/utils';
import type { HTMLAttributes } from 'react';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'destructive';
};

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  const base = 'relative w-full rounded-lg border p-4 text-sm';
  const variants: Record<typeof variant, string> = {
    default: 'border-amber-500/40 bg-amber-500 text-amber-100',
    destructive: 'border-rose-500/50 bg-rose-950/70 text-rose-100 shadow-inner shadow-rose-900/40',
  };
  return <div role="alert" className={cn(base, variants[variant], className)} {...props} />;
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm opacity-90', className)} {...props} />;
}
