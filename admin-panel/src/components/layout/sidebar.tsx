'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const NAV: Array<{ href: string; label: string; icon: typeof UsersIcon }> = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
  { href: '/users', label: 'Foydalanuvchilar', icon: UsersIcon },
  { href: '/payments', label: "To'lovlar", icon: CreditCard },
  { href: '/broadcasts', label: 'Xabarlar', icon: Bell },
  { href: '/auto-messages', label: 'Avto xabarlar', icon: Clock },
  { href: '/content', label: 'Kontent', icon: FileText },
  { href: '/statistics', label: 'Statistika', icon: BarChart3 },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <span className="text-xs font-semibold text-primary-foreground">
            CB
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tighter text-foreground">
            Course Admin
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Boshqaruv markazi
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-subtle text-foreground'
                  : 'text-muted-foreground hover:bg-subtle/60 hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
              )}
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5 border-t border-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
            pathname.startsWith('/settings')
              ? 'bg-subtle text-foreground'
              : 'text-muted-foreground hover:bg-subtle/60 hover:text-foreground',
          )}
        >
          <SettingsIcon className="h-4 w-4" />
          Sozlamalar
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-subtle/60 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </div>
    </aside>
  );
}
