import { useMemo } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { Project } from "../core/projects";
import { ProjectAvatar } from "./ProjectAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type ProjectSwitcherProps = {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  onCreateNew?: () => void;
  label?: string;
  renderTrigger?: (project: Project | undefined) => ReactNode;
};

export function ProjectSwitcher({
  projects,
  value,
  onChange,
  onCreateNew,
  label = "Projects",
  renderTrigger,
}: ProjectSwitcherProps) {
  const selected = useMemo(() => projects.find((p) => p.id === value) ?? projects[0], [projects, value]);

  const defaultTrigger = (
    <button
      type="button"
      className="flex w-full max-w-xl items-center justify-between rounded-lg border border-[#e4e7ee] bg-white px-3 py-2 text-left shadow-sm shadow-[#d5dce9]/40 transition hover:shadow"
    >
      <div className="flex items-center gap-2.5">
        {selected && <ProjectAvatar project={selected} />}
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#6b7280]">Project</span>
          <span className="text-sm font-semibold text-[#0f172a]">{selected?.name ?? "Select a project"}</span>
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-[#6b7280]" />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderTrigger ? renderTrigger(selected) : defaultTrigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[240px] rounded-xl border border-[#e4e7ee] p-0">
        <DropdownMenuLabel className="border-b border-[#edf0f6] px-4 pb-2 pt-3 text-[13px] font-semibold text-[#6b7280]">
          {label}
        </DropdownMenuLabel>
        <div className="max-h-80 overflow-y-auto py-1">
          {projects.map((project) => {
            const isActive = project.id === selected?.id;
            return (
              <DropdownMenuItem
                key={project.id}
                className={`flex items-center justify-between ${isActive ? "bg-[#eef2ff]" : ""}`}
                onSelect={(event) => {
                  event.preventDefault();
                  onChange(project.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <ProjectAvatar project={project} />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[#0f172a]">{project.name}</span>
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-[#0f172a]" />}
              </DropdownMenuItem>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f172a]"
          onSelect={(event) => {
            event.preventDefault();
            onCreateNew?.();
          }}
        >
          <Plus className="h-4 w-4 text-[#0f172a]" />
          Create new project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
