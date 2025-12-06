import type { ReactNode } from "react";

type TopBarProps = {
  left?: ReactNode;
  right?: ReactNode;
};

export function TopBar({ left, right }: TopBarProps) {
  return (
    <header className="flex h-20 items-center justify-between gap-4 border-b border-[#e4e7ee] bg-[#f8fafc]/90 px-4 backdrop-blur">
      <div className="flex-1">{left}</div>
      <div className="text-xs text-[#6b7280]">{right ?? "Context actions coming soon"}</div>
    </header>
  );
}
