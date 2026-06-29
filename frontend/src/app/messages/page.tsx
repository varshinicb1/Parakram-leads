'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Search, MessageSquare, CheckCircle, Clock, XCircle,
  Mail, Linkedin, Send, Eye, Reply, AlertCircle,
  ChevronDown, ChevronRight, BrainCircuit, Sparkles,
  ThumbsUp, ThumbsDown, Minus, ArrowRight,
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

const channelMeta: Record<string, { icon: any; bg: string; text: string; border: string }> = {
  email: { icon: Mail, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  whatsapp: { icon: MessageSquare, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  linkedin: { icon: Linkedin, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
};

const statusMeta: Record<string, { icon: any; bg: string; text: string }> = {
  draft: { icon: Clock, bg: 'bg-zinc-700', text: 'text-zinc-300' },
  approved: { icon: CheckCircle, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  sent: { icon: Send, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  delivered: { icon: CheckCircle, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  opened: { icon: Eye, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  replied: { icon: Reply, bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  failed: { icon: XCircle, bg: 'bg-red-500/20', text: 'text-red-400' },
};

const truncate = (text: string, len: number) =>
  text.length > len ? text.slice(0, len) + '\u2026' : text;

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const sentimentIcon = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive': return <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />;
    case 'negative': return <ThumbsDown className="w-3.5 h-3.5 text-red-400" />;
    default: return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
  }
};

const sentimentLabel = (sentiment?: string) => {
  switch (sentiment) {
    case 'positive': return 'Positive';
    case 'negative': return 'Negative';
    default: return 'Neutral';
  }
};

export default function MessagesPage() {
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [leadMap, setLeadMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, any>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await api.messages.filter({ page: '1', per_page: '500' });
      setAllMessages(Array.isArray(msgs) ? msgs : []);

      try {
        const leadsRes = await api.leads.list({ page: 1, per_page: 500 });
        const map: Record<string, any> = {};
        (leadsRes.leads || []).forEach((l: any) => { map[l.id] = l; });
        setLeadMap(map);
      } catch {}
    } catch {
      setAllMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const analyzeReply = async (msg: any) => {
    if (analysisCache[msg.id] || !msg.reply_content) return;
    setAnalyzingId(msg.id);
    try {
      const result = await api.intelligence.analyzeResponse({
        reply_text: msg.reply_content,
        lead_name: leadMap[msg.lead_id]?.business_name || '',
      });
      setAnalysisCache((prev) => ({ ...prev, [msg.id]: result }));
    } catch {}
    setAnalyzingId(null);
  };

  const filtered = allMessages.filter((msg) => {
    if (channel && msg.channel !== channel) return false;
    if (status && msg.status !== status) return false;
    if (search) {
      const name = (leadMap[msg.lead_id]?.business_name || '').toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleExpand = (msgId: string) => {
    const newExpanded = expandedId === msgId ? null : msgId;
    setExpandedId(newExpanded);
    if (newExpanded) {
      const msg = allMessages.find((m) => m.id === newExpanded);
      if (msg?.reply_content) analyzeReply(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Messages</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filtered.length} message{filtered.length !== 1 ? 's' : ''}
            {(channel || status || search) && ' (filtered)'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); }}
          className="relative flex-1 max-w-xs"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by lead name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 placeholder-zinc-600 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
          />
        </form>
        <select
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-zinc-300 focus:ring-2 focus:ring-amber-500/50 outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Lead</th>
                <th className="text-center px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Channel</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Content</th>
                <th className="text-center px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Sent At</th>
                <th className="text-center px-6 py-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Reply</th>
                <th className="w-8 px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto" />
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">
                      {allMessages.length === 0
                        ? 'No messages sent yet. Approve outreach to send messages.'
                        : 'No messages match your filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((msg) => {
                  const isExpanded = expandedId === msg.id;
                  const chMeta = channelMeta[msg.channel] || channelMeta.email;
                  const stMeta = statusMeta[msg.status] || statusMeta.draft;
                  const ChIcon = chMeta.icon;
                  const StIcon = stMeta.icon;
                  const leadInfo = leadMap[msg.lead_id];
                  const analysis = analysisCache[msg.id];

                  return (
                    <React.Fragment key={msg.id}>
                      <tr
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-zinc-800/30' : ''
                        }`}
                        onClick={() => handleExpand(msg.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {leadInfo?.business_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <Link
                                href={`/leads/${msg.lead_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-zinc-200 hover:text-amber-400 transition-colors"
                              >
                                {leadInfo?.business_name || 'Unknown Lead'}
                              </Link>
                              <p className="text-[10px] text-zinc-600 font-mono">{msg.lead_id?.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${chMeta.bg} ${chMeta.text} ${chMeta.border} border`}>
                            <ChIcon className="w-3 h-3" />
                            {msg.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-zinc-400 max-w-xs truncate">
                            {truncate(msg.content, 80)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${stMeta.bg} ${stMeta.text}`}>
                            <StIcon className="w-3 h-3" />
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs whitespace-nowrap">
                          {formatDate(msg.sent_at || msg.created_at)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {msg.reply_content ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Reply className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <ChevronRight className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-zinc-900/40">
                          <td colSpan={7} className="px-6 py-6">
                            <div className="space-y-5 max-w-3xl">
                              {/* Timeline Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { label: 'Created', value: formatDate(msg.created_at), color: 'text-zinc-400' },
                                  { label: 'Sent', value: formatDate(msg.sent_at), color: msg.sent_at ? 'text-blue-400' : 'text-zinc-600' },
                                  { label: 'Delivered', value: formatDate(msg.delivered_at), color: msg.delivered_at ? 'text-emerald-400' : 'text-zinc-600' },
                                  { label: 'Opened', value: formatDate(msg.opened_at), color: msg.opened_at ? 'text-purple-400' : 'text-zinc-600' },
                                ].map((item) => (
                                  <div key={item.label} className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-3">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">{item.label}</p>
                                    <p className={`text-xs mt-1 font-medium ${item.color}`}>{item.value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Message Bubble */}
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Sent Message</p>
                                <div className={`rounded-xl p-4 border ${chMeta.border} ${chMeta.bg} text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed`}>
                                  {msg.content}
                                </div>
                              </div>

                              {/* Reply with Intelligence */}
                              {msg.reply_content && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                                      Reply {msg.replied_at && `— ${formatDate(msg.replied_at)}`}
                                    </p>
                                    {analyzingId === msg.id && (
                                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <BrainCircuit className="w-3 h-3 animate-pulse" /> Analyzing...
                                      </span>
                                    )}
                                  </div>
                                  <div className="rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-100 whitespace-pre-wrap leading-relaxed">
                                    {msg.reply_content}
                                  </div>

                                  {/* AI Analysis */}
                                  {analysis && (
                                    <div className="mt-3 grid grid-cols-3 gap-3">
                                      <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          {sentimentIcon(analysis.sentiment)}
                                          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Sentiment</span>
                                        </div>
                                        <p className={`text-xs font-medium ${analysis.sentiment === 'positive' ? 'text-emerald-400' : analysis.sentiment === 'negative' ? 'text-red-400' : 'text-zinc-300'}`}>
                                          {sentimentLabel(analysis.sentiment)}
                                        </p>
                                      </div>
                                      <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <BrainCircuit className="w-3.5 h-3.5 text-zinc-500" />
                                          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Intent</span>
                                        </div>
                                        <p className="text-xs font-medium text-zinc-200 capitalize">
                                          {analysis.intent?.replace(/_/g, ' ') || 'Unknown'}
                                        </p>
                                      </div>
                                      <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 p-3">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                                          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Urgency</span>
                                        </div>
                                        <p className={`text-xs font-medium ${
                                          (analysis.urgency || 0) >= 70 ? 'text-red-400' :
                                          (analysis.urgency || 0) >= 40 ? 'text-amber-400' : 'text-zinc-300'
                                        }`}>
                                          {analysis.urgency ? `${Math.round(analysis.urgency)}/100` : '—'}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {!analysis && analyzingId !== msg.id && (
                                    <button
                                      onClick={() => analyzeReply(msg)}
                                      className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                      <BrainCircuit className="w-3.5 h-3.5" />
                                      Analyze with AI
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Lead Quick Info */}
                              {leadInfo && (
                                <div className="flex items-center gap-3 pt-2">
                                  <Link
                                    href={`/leads/${msg.lead_id}`}
                                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                  >
                                    View lead profile <ArrowRight className="w-3 h-3" />
                                  </Link>
                                  {leadInfo.phone && (
                                    <span className="text-xs text-zinc-600">{leadInfo.phone}</span>
                                  )}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-500">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm rounded-xl border border-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
