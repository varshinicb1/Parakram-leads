'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, clearToken, getOrgId, setOrgId, api } from '@/lib/api';
import {
  LayoutDashboard, Users, MessageSquare, Settings, LogOut,
  Building2, ChevronDown, Check, Sparkles, Globe, Upload, Shield,
} from 'lucide-react';
import AlertNotifications from '@/components/AlertNotifications';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/audit', label: 'Audit Log', icon: Shield },
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
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
    <div className="flex h-screen bg-[#09090b] text-neutral-100 overflow-hidden">
      {/* Sidebar - Premium Dark Titanium / Obsidian */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between relative z-30">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Logo Brand area */}
          <div className="px-6 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-semibold block">A Parakram Suite Product</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
              <span className="text-zinc-300">Parakram</span>
              <span className="text-gradient-gold">Leads</span>
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Autonomous Intelligence Engine</p>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                    active
                      ? 'bg-gradient-to-r from-zinc-900 to-zinc-950 text-white shadow-inner border border-zinc-800'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${active ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global/Worldwide status badge and Subscription Plan indicator starting from $3 */}
        <div className="px-4 py-3 m-4 bg-gradient-to-br from-zinc-900 to-black rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-zinc-500 animate-pulse" />
              <span className="text-[11px] text-zinc-400 font-medium">Worldwide Active</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] bg-amber-400/10 text-amber-400 rounded-full font-bold border border-amber-400/20">
              $3/mo
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">Premium Account</span>
            <span className="text-[10px] font-semibold text-zinc-300">Active</span>
          </div>
        </div>

        {/* User logout section */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-red-950/20 hover:text-red-400 transition-all w-full group"
          >
            <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-8 py-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-200">
                {navItems.find((i) => pathname.startsWith(i.href))?.label || 'Dashboard'}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-900 text-zinc-400 rounded-md border border-zinc-800">v1.0</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Organization Switcher */}
              {orgs.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOrgMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-200"
                  >
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <span className="font-medium max-w-[140px] truncate">
                      {currentOrg?.name || 'Select Org'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${orgMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {orgMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOrgMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                        <div className="p-2 border-b border-zinc-800">
                          <p className="text-xs text-zinc-500 px-3 py-1 font-medium">Switch Organization</p>
                        </div>
                        <div className="p-1 max-h-64 overflow-y-auto">
                          {orgs.map((org) => (
                            <button
                              key={org.id}
                              onClick={() => handleSwitchOrg(org.id)}
                              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                                org.id === currentOrgId
                                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                                  : 'text-zinc-300 hover:bg-zinc-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {org.id === currentOrgId && (
                                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="p-1 border-t border-zinc-800">
                          <Link
                            href="/organizations"
                            onClick={() => setOrgMenuOpen(false)}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-amber-400 hover:bg-zinc-800 transition-colors"
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
              <AlertNotifications />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#09090b]">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}