import { Outlet } from "react-router-dom";
import { SidebarNav } from "../components/SidebarNav";
import { TopBar } from "../components/TopBar";
import { navItems } from "../core/nav";

export function ShellLayout() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#0f172a]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-b border-[#e4e7ee] bg-[#f8fafc] md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 px-4 py-5 text-lg font-semibold tracking-tight text-[#0f172a]">
            <img
              src="/structura.svg"
              alt="Structura logo"
              className="h-10 w-10 rounded-xl border border-[#cfd6e8] bg-[#0b1222] shadow-md shadow-[#7ba5ff]/30"
            />
            <span>Structura</span>
          </div>
          <SidebarNav items={navItems} />
        </aside>

        <div className="flex min-h-screen flex-col">
          <TopBar />
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
