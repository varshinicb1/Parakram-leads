'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search, MessageSquare, CheckCircle, Clock, XCircle, ChevronDown,
  Mail, Linkedin, Send, Eye, Reply, AlertCircle,
} from 'lucide-react';

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened', label: 'Opened' },
  { value: 'replied', label: 'Replied' },
  { value: 'failed', label: 'Failed' },
];

const channelBadge = (channel: string) => {
  switch (channel) {
    case 'email':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Mail className="w-3 h-3" />Email</span>;
    case 'whatsapp':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><MessageSquare className="w-3 h-3" />WhatsApp</span>;
    case 'linkedin':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700"><Linkedin className="w-3 h-3" />LinkedIn</span>;
    default:
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{channel}</span>;
  }
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    approved: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    opened: 'bg-purple-100 text-purple-700',
    replied: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
    case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'opened': return <Eye className="w-4 h-4 text-purple-500" />;
    case 'replied': return <Reply className="w-4 h-4 text-emerald-500" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const truncate = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) + '…' : text;

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function MessagesPage() {
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [leadMap, setLeadMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all messages (paginated)
      const msgs = await api.messages.filter({ page: '1', per_page: '200' });
      setAllMessages(Array.isArray(msgs) ? msgs : []);

      // Fetch leads to build business_name map
      try {
        const leadsRes = await api.leads.list({ page: 1, per_page: 500 });
        const map: Record<string, string> = {};
        (leadsRes.leads || []).forEach((l: any) => { map[l.id] = l.business_name; });
        setLeadMap(map);
      } catch {
        // ignore lead fetch failure
      }
    } catch {
      setAllMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side filtering
  const filtered = allMessages.filter((msg) => {
    if (channel && msg.channel !== channel) return false;
    if (status && msg.status !== status) return false;
    if (search) {
      const name = (leadMap[msg.lead_id] || '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {filtered.length} message{filtered.length !== 1 ? 's' : ''}
          {(channel || status || search) && ' (filtered)'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by lead name..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none w-64"
            />
          </form>
          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sigma-500 outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-4 font-medium text-gray-600">Lead</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Channel</th>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Content</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Status</th>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Sent At</th>
                <th className="text-center px-6 py-4 font-medium text-gray-600">Reply</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600 mx-auto" />
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {allMessages.length === 0
                        ? 'No messages sent yet. Approve outreach to send messages.'
                        : 'No messages match your filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((msg) => {
                  const isExpanded = expandedId === msg.id;
                  return (
                    <React.Fragment key={msg.id}>
                      <tr
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">
                            {leadMap[msg.lead_id] || 'Unknown Lead'}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{msg.lead_id?.slice(0, 8)}…</p>
                        </td>
                        <td className="px-6 py-4 text-center">{channelBadge(msg.channel)}</td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 max-w-xs truncate">
                            {truncate(msg.content, 80)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {statusIcon(msg.status)}
                            {statusBadge(msg.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(msg.sent_at || msg.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {msg.reply_content ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <Reply className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-5">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <p className="text-gray-400 uppercase mb-0.5">Created</p>
                                  <p className="text-gray-700">{formatDate(msg.created_at)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 uppercase mb-0.5">Sent</p>
                                  <p className="text-gray-700">{formatDate(msg.sent_at)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 uppercase mb-0.5">Delivered</p>
                                  <p className="text-gray-700">{formatDate(msg.delivered_at)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 uppercase mb-0.5">Opened</p>
                                  <p className="text-gray-700">{formatDate(msg.opened_at)}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase mb-1">Full Message</p>
                                <div className="bg-white rounded-lg p-4 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                                  {msg.content}
                                </div>
                              </div>
                              {msg.reply_content && (
                                <div>
                                  <p className="text-xs text-gray-400 uppercase mb-1">
                                    Reply {msg.replied_at && `— ${formatDate(msg.replied_at)}`}
                                  </p>
                                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 text-sm text-emerald-800 whitespace-pre-wrap">
                                    {msg.reply_content}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-2 py-2 text-sm text-gray-400">…</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 text-sm border rounded-lg ${
                      p === currentPage
                        ? 'bg-sigma-600 text-white border-sigma-600'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.messages.list()
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opened': return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case 'replied': return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No messages sent yet. Approve outreach to send messages.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <div key={msg.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(msg.status)}
                    <span className="text-xs font-medium uppercase text-gray-400">{msg.channel}</span>
                    <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    msg.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                    msg.status === 'delivered' ? 'bg-green-50 text-green-600' :
                    msg.status === 'opened' ? 'bg-amber-50 text-amber-600' :
                    msg.status === 'replied' ? 'bg-green-50 text-green-600' :
                    msg.status === 'failed' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {msg.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{msg.content}</p>
                {msg.reply_content && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Reply Received</p>
                    <p className="text-sm text-green-800">{msg.reply_content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
