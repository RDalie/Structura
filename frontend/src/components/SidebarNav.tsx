import { NavLink } from "react-router-dom";
import type { NavItem } from "../core/nav";

type SidebarNavProps = {
  items: NavItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-1 md:overflow-visible md:px-4">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) =>
            [
              "group flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors",
              "md:flex-row md:items-center md:justify-between md:gap-0",
              isActive
                ? "bg-slate-800 text-slate-50 shadow-sm"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
            ].join(" ")
          }
        >
          <span className="font-medium">{item.label}</span>
          <span className="text-[11px] text-slate-400 md:hidden">{item.blurb}</span>
        </NavLink>
      ))}
    </nav>
  );
}
