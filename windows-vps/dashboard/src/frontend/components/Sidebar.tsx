import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  Server,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/services', label: 'Services', icon: Server },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-border bg-sidebar-bg">
      <div className="flex h-14 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-accent shadow-sm">
          <span className="text-[11px] font-bold text-white tracking-tight">J</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-text-primary tracking-tight">Jalebi VPS</span>
          <span className="text-[10px] text-text-muted font-medium tracking-wide">Mission Control</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hover'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
                )}
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2.5 rounded-[12px] bg-surface-secondary/50 px-3 py-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-accent/10">
            <span className="text-[10px] font-bold text-accent">v3</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-medium text-text-primary">3.0.0</span>
            <span className="text-[10px] text-text-muted">Stable</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
