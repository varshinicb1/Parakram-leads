'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Shield, Search, ChevronDown, ChevronRight, Clock, User,
  Building2, Activity, ArrowLeft, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  post_lead: { label: 'Created Lead', color: 'bg-emerald-500/10 text-emerald-400' },
  patch_lead: { label: 'Updated Lead', color: 'bg-blue-500/10 text-blue-400' },
  delete_lead: { label: 'Deleted Lead', color: 'bg-red-500/10 text-red-400' },
  post_message: { label: 'Sent Message', color: 'bg-purple-500/10 text-purple-400' },
  post_organizations: { label: 'Created Org', color: 'bg-amber-500/10 text-amber-400' },
  patch_organizations: { label: 'Updated Org', color: 'bg-amber-500/10 text-amber-400' },
  post_scraper: { label: 'Ran Scraper', color: 'bg-cyan-500/10 text-cyan-400' },
  post_intelligence: { label: 'Intelligence Action', color: 'bg-violet-500/10 text-violet-400' },
  post_auth: { label: 'Auth Action', color: 'bg-zinc-500/10 text-zinc-400' },
};

const RESOURCE_ICONS: Record<string, any> = {
  lead: Shield,
  leads: Shield,
  message: Activity,
  messages: Activity,
  organization: Building2,
  organizations: Building2,
  scraper: Activity,
  auth: User,
  intelligence: Activity,
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filterAction) params.action = filterAction;
      if (filterResource) params.resource = filterResource;
      const data = await api.audit.list(params);
      setEntries(data.entries || []);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, filterAction, filterResource]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const uniqueActions = Array.from(new Set(entries.map((e) => e.action)));
  const uniqueResources = Array.from(new Set(entries.map((e) => e.resource).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} event{total !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterResource}
            onChange={(e) => { setFilterResource(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
          >
            <option value="">All Resources</option>
            {uniqueResources.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]?.label || a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No audit events found</p>
            <p className="text-xs text-zinc-700 mt-1">Events appear when you create or modify resources</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {entries.map((entry) => {
              const actionMeta = ACTION_LABELS[entry.action] || { label: entry.action || 'unknown', color: 'bg-zinc-500/10 text-zinc-400' };
              const ResIcon = RESOURCE_ICONS[entry.resource] || Shield;
              return (
                <div key={entry.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionMeta.color}`}>
                      <ResIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                        {entry.resource_id && (
                          <span className="text-[10px] text-zinc-600 font-mono">#{entry.resource_id.slice(0, 8)}</span>
                        )}
                        <span className="text-[10px] text-zinc-600">{formatTime(entry.created_at)}</span>
                      </div>
                      {entry.details && (
                        <p className="text-xs text-zinc-500 mt-1.5 truncate max-w-xl">{entry.details}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-700">
                        {entry.user_id && <span>user: {entry.user_id.slice(0, 8)}...</span>}
                        {entry.ip_address && <span>ip: {entry.ip_address}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-4 py-2 text-sm rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-800 transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-800 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
