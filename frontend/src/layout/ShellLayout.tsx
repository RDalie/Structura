import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SidebarNav } from '../components/SidebarNav';
import { TopBar } from '../components/TopBar';
import { ProjectSwitcher } from '../components/ProjectSwitcher';
import { navItems } from '../core/nav';
import { demoProjects } from '../core/projects';

export function ShellLayout() {
  const [activeProjectId, setActiveProjectId] = useState<string>(demoProjects[0]?.id ?? '');
  const activeProject = demoProjects.find((p) => p.id === activeProjectId) ?? demoProjects[0];

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[#e4e7ee] bg-[#f8fafc] md:border-b-0 md:border-r">
          <div className="px-4 py-5">
            <ProjectSwitcher
              projects={demoProjects}
              value={activeProjectId}
              onChange={setActiveProjectId}
              onCreateNew={() => {
                // Placeholder until CRUD is wired up.
                alert('Project creation coming soon.');
              }}
              renderTrigger={(project) => (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg border border-[#e4e7ee] bg-white px-3 py-2 text-left text-sm font-semibold tracking-tight text-[#0f172a] shadow-sm shadow-[#d5dce9]/40 transition hover:shadow"
                >
                  <img
                    src="/structura.svg"
                    alt="Structura logo"
                    className="h-10 w-10 rounded-xl border border-[#cfd6e8] bg-[#0b1222] shadow-md shadow-[#7ba5ff]/30"
                  />
                  <div className="flex max-w-full flex-col">
                    <span>Structura</span>
                    <p className="text-xs max-w-[6rem] truncate font-normal sm:max-w-[8rem] text-[#6b7280]">
                      {project?.name ?? 'Select a project'}
                    </p>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-[#6b7280]" />
                </button>
              )}
            />
          </div>
          <SidebarNav items={navItems} />
        </aside>

        <div className="flex min-h-screen flex-col">
          <TopBar
            left={
              <div className="text-sm font-semibold text-[#0f172a]">
                Project:{' '}
                <span className="text-[#374151]">{activeProject?.name ?? 'Select a project'}</span>
              </div>
            }
            right={<div className="text-xs text-[#6b7280]">Context actions coming soon</div>}
          />
          <main className="flex-1 bg-[#f6f8fb] px-4 py-6">
            <div className="min-h-full rounded-xl border border-[#e4e7ee] bg-[#ffffff] p-6 shadow-inner shadow-[#d5dce9]/25">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
