type TopBarProps = {
  projectName?: string;
  subtitle?: string;
};

export function TopBar({ projectName = "Untitled Workspace", subtitle }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#e4e7ee] bg-[#f8fafc]/90 px-4 backdrop-blur">
      <div>
        <div className="pb-1 text-xs uppercase tracking-[0.15em] text-[#6b7280]">Project</div>
        <div className="text-sm font-semibold text-[#0f172a]">{projectName}</div>
      </div>
      <div className="text-xs text-[#6b7280]">{subtitle ?? "Context actions coming soon"}</div>
    </header>
  );
}
