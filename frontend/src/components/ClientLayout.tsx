'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, clearToken, getOrgId, setOrgId, api } from '@/lib/api';
import {
  LayoutDashboard, Users, MessageSquare, Settings, LogOut, Bell,
  Building2, ChevronDown, Check,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Org switcher state
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(getOrgId());
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token && pathname !== '/login') {
      router.push('/login');
    } else {
      setAuthenticated(!!token);
    }
    setLoading(false);
  }, [pathname, router]);

  // Fetch orgs for switcher
  useEffect(() => {
    if (!authenticated) return;
    api.organizations.list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setOrgs(list);
        // Auto-set first org if none selected
        if (!currentOrgId && list.length > 0) {
          setOrgId(list[0].id);
          setCurrentOrgId(list[0].id);
        }
      })
      .catch(() => {});
  }, [authenticated]);

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  const handleSwitchOrg = async (orgId: string) => {
    try {
      await api.organizations.switch(orgId);
      setOrgId(orgId);
      setCurrentOrgId(orgId);
      setOrgMenuOpen(false);
      window.location.reload();
    } catch {
      // ignore
    }
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

  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 relative flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-sigma-700">Sigma Leads</h1>
          <p className="text-xs text-gray-500 mt-1">Lead Intelligence Platform</p>
        </div>
        <nav className="px-4 space-y-1 flex-1">
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
        <div className="p-4 border-t border-gray-200">
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
              {/* Org switcher */}
              {orgs.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOrgMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-sigma-600" />
                    <span className="font-medium text-gray-700 max-w-[140px] truncate">
                      {currentOrg?.name || 'Select Org'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${orgMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {orgMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOrgMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <p className="text-xs text-gray-400 px-3 py-1">Switch Organization</p>
                        </div>
                        <div className="p-1 max-h-64 overflow-y-auto">
                          {orgs.map((org) => (
                            <button
                              key={org.id}
                              onClick={() => handleSwitchOrg(org.id)}
                              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                                org.id === currentOrgId
                                  ? 'bg-sigma-50 text-sigma-700'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {org.id === currentOrgId && (
                                <Check className="w-4 h-4 text-sigma-600 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="p-1 border-t border-gray-100">
                          <Link
                            href="/organizations"
                            onClick={() => setOrgMenuOpen(false)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sigma-600 hover:bg-sigma-50 transition-colors"
                          >
                            <Building2 className="w-4 h-4" />
                            Manage Organizations
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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
