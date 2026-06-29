'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Building2, Target,
  TrendingUp, AlertTriangle, Sparkles, BrainCircuit, Clock,
  MessageSquare, Send, CheckCircle, XCircle, Loader2, Linkedin,
} from 'lucide-react';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(false);
  const [linkedinSending, setLinkedinSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.leads.get(id).catch(() => null),
      api.intelligence.full(id).catch(() => null),
    ]).then(([leadData, intelData]) => {
      if (leadData) setLead(leadData);
      if (intelData) setIntel(intelData);
    }).finally(() => setLoading(false));
  }, [id]);

  const triggerAnalysis = async () => {
    setIntelLoading(true);
    try {
      await api.intelligence.triggerAnalysis(id);
      const intelData = await api.intelligence.full(id);
      if (intelData) setIntel(intelData);
    } catch {}
    setIntelLoading(false);
  };

  const sendLinkedin = async () => {
    setLinkedinSending(true);
    try {
      await api.intelligence.sendLinkedin(id);
    } catch {}
    setLinkedinSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="rounded-2xl p-8 bg-zinc-900/80 border border-zinc-800 text-center">
        <p className="text-zinc-400">Lead not found</p>
        <button onClick={() => router.push('/leads')} className="mt-4 text-sm text-amber-400 hover:underline">Back to leads</button>
      </div>
    );
  }

  const prediction = intel?.prediction || null;
  const sequence = intel?.sequence || null;
  const enrichment = intel?.enrichment || null;
  const signals = intel?.buying_signals || null;
  const qualityScore = lead.predictive_quality_score || prediction?.quality_score || 0;

  const getQualityColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-zinc-400';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 70) return 'Premium';
    if (score >= 40) return 'Promising';
    return 'Explore';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <button onClick={() => router.push('/leads')} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to leads
      </button>

      {/* Header */}
      <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              {lead.business_name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{lead.business_name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                {lead.industry && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{lead.industry}</span>}
                {lead.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lead.location}</span>}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                  lead.category_flag === 'hot' ? 'bg-red-500/20 text-red-400' :
                  lead.category_flag === 'warm' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-zinc-700 text-zinc-400'
                }`}>{lead.category_flag}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={triggerAnalysis} disabled={intelLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-600 text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {intelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {intelLoading ? 'Analyzing...' : 'Run Intelligence'}
            </button>
            {lead.outreach_message_linkedin && lead.outreach_approved && (
              <button onClick={sendLinkedin} disabled={linkedinSending} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-400 text-sm font-semibold hover:bg-sky-600/30 transition-colors disabled:opacity-50">
                {linkedinSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                {linkedinSending ? 'Sending...' : 'Send LinkedIn'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact & Profile */}
        <div className="space-y-6">
          <div className="rounded-2xl p-5 bg-zinc-900/80 border border-zinc-800 shadow-xl">
            <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              {lead.phone && <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-zinc-500" /><span className="text-zinc-300">{lead.phone}</span></div>}
              {lead.email && <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-zinc-500" /><span className="text-zinc-300">{lead.email}</span></div>}
              {lead.website_url && <div className="flex items-center gap-3 text-sm"><Globe className="w-4 h-4 text-zinc-500" /><a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate">{lead.website_url}</a></div>}
              {lead.owner_name && <div className="flex items-center gap-3 text-sm"><span className="w-4 h-4 text-zinc-500">👤</span><span className="text-zinc-300">{lead.owner_name}</span></div>}
            </div>
          </div>

          {lead.business_description && (
            <div className="rounded-2xl p-5 bg-zinc-900/80 border border-zinc-800 shadow-xl">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">About</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{lead.business_description}</p>
            </div>
          )}
        </div>

        {/* Center: Intelligence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quality Score Card */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Predictive Intelligence</h3>
              {lead.last_intelligence_update && (
                <span className="text-[10px] text-zinc-600">
                  Updated {new Date(lead.last_intelligence_update).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Quality Score</p>
                <p className={`text-2xl font-bold ${getQualityColor(qualityScore)}`}>{Math.round(qualityScore)}</p>
                <p className={`text-xs mt-0.5 ${getQualityColor(qualityScore)}`}>{getQualityLabel(qualityScore)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Conversion</p>
                <p className="text-2xl font-bold text-violet-400">
                  {Math.round((lead.conversion_probability || prediction?.conversion_probability || 0) * 100)}%
                </p>
                <p className="text-xs text-violet-400/70 mt-0.5">Probability</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Urgency</p>
                <p className={`text-2xl font-bold ${(lead.buying_urgency || prediction?.urgency || 0) >= 70 ? 'text-red-400' : 'text-amber-400'}`}>
                  {Math.round(lead.buying_urgency || prediction?.urgency || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">/ 100</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Best Channel</p>
                <p className="text-lg font-bold text-emerald-400 capitalize">
                  {lead.optimal_channel || prediction?.recommended_channel || 'email'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Recommended</p>
              </div>
            </div>
          </div>

          {/* Outreach Sequence */}
          {sequence && (
            <div className="rounded-2xl p-5 bg-zinc-900/80 border border-zinc-800 shadow-xl">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-4">Outreach Sequence</h3>
              <div className="space-y-3">
                {sequence.steps?.map((step: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      step.channel === 'whatsapp' ? 'bg-emerald-500/20 text-emerald-400' :
                      step.channel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-sky-500/20 text-sky-400'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium capitalize ${
                          step.channel === 'whatsapp' ? 'text-emerald-400' :
                          step.channel === 'email' ? 'text-blue-400' : 'text-sky-400'
                        }`}>{step.channel}</span>
                        <span className="text-[10px] text-zinc-500">Day {step.day || i + 1}</span>
                        <span className="text-[10px] text-zinc-500 capitalize">· {step.purpose || 'follow-up'}</span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-2">{step.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buying Signals */}
          {signals && signals.active_signals?.length > 0 && (
            <div className="rounded-2xl p-5 bg-zinc-900/80 border border-amber-500/20 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Buying Signals Detected</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {signals.active_signals.map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    {s.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {signals.seasonal_opportunity && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-300">Seasonal opportunity detected — reach out before peak season</span>
                </div>
              )}
            </div>
          )}

          {/* Enrichment Data */}
          {enrichment && (
            <div className="rounded-2xl p-5 bg-zinc-900/80 border border-zinc-800 shadow-xl">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-4">Enrichment</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {enrichment.social_profiles && Object.keys(enrichment.social_profiles).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Social Profiles</p>
                    <div className="space-y-1">
                      {Object.entries(enrichment.social_profiles).map(([k, v]) => (
                        <a key={k} href={v as string} target="_blank" rel="noopener noreferrer" className="block text-xs text-amber-400 hover:underline truncate">
                          {k}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {enrichment.tech_stack?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {enrichment.tech_stack.map((t: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-300">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {enrichment.review_presence?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Review Platforms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {enrichment.review_presence.map((r: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-300">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                {enrichment.business_size && (
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Business Size</p>
                    <p className="text-sm text-zinc-300 capitalize">{enrichment.business_size}</p>
                  </div>
                )}
                {enrichment.competitors?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 mb-1">Competitors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {enrichment.competitors.map((c: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-red-500/10 text-xs text-red-300">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
