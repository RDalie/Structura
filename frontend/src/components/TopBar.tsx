type TopBarProps = {
  projectName?: string;
  subtitle?: string;
};

export function TopBar({ projectName = "Untitled Workspace", subtitle }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur">
      <div>
        <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Project</div>
        <div className="text-sm font-semibold text-slate-50">{projectName}</div>
      </div>
      <div className="text-xs text-slate-400">
        {subtitle ?? "Context actions coming soon"}
      </div>
    </header>
  );
}
