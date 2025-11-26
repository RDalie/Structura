import { Outlet } from "react-router-dom";
import { SidebarNav } from "../components/SidebarNav";
import { TopBar } from "../components/TopBar";
import { navItems } from "../core/nav";

export function ShellLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-900 md:border-b-0 md:border-r">
          <div className="px-4 py-5 text-lg font-semibold tracking-tight">Structura</div>
          <SidebarNav items={navItems} />
        </aside>

        <div className="flex min-h-screen flex-col">
          <TopBar />
          <main className="flex-1 bg-slate-950 px-4 py-6">
            <div className="min-h-full rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
