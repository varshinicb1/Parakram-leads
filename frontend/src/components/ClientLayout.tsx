'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, clearToken } from '@/lib/api';
import {
  LayoutDashboard, Users, MessageSquare, Settings, LogOut, Bell,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else {
      setAuthenticated(!!token);
    }
    setLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600" />
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sigma-700">Sigma Leads</h1>
          <p className="text-xs text-gray-500 mt-1">Lead Intelligence Platform</p>
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sigma-50 text-sigma-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {navItems.find((i) => pathname.startsWith(i.href))?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
