import type { Project } from '../core/projects';

type ProjectAvatarProps = {
  project: Pick<Project, 'code' | 'color' | 'name'>;
  className?: string;
};

export function ProjectAvatar({ project, className }: ProjectAvatarProps) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white shadow-sm shadow-black/10 ${className ?? ''}`}
      style={{ backgroundColor: project.color }}
      aria-hidden
      title={project.name}
    >
      {project.code}
    </span>
  );
}
