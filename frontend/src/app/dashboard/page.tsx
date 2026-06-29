'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { PRODUCT } from '@/lib/product';
import Link from 'next/link';
import ActivityFeed from '@/components/ActivityFeed';
import {
  Users, MessageSquare, TrendingUp, DollarSign, Target, Zap,
  Sparkles, BellRing, BrainCircuit, ArrowRight, AlertTriangle,
} from 'lucide-react';

interface DashboardData {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  messages_sent: number;
  responses: number;
  estimated_pipeline_value: number;
  conversion_rate: number;
  revenue_forecast: number;
  high_priority_leads: number;
  leads_ready_to_contact: number;
  avg_quality_score: number;
  avg_conversion_probability: number;
  pipeline_counts: Record<string, number>;
  top_lead: {
    id: string;
    business_name: string;
    industry: string;
    quality_score: number;
    conversion_probability: number;
    buying_urgency: number;
    optimal_channel: string;
    category_flag: string;
  } | null;
}

const defaultData: DashboardData = {
  total_leads: 0, hot_leads: 0, warm_leads: 0, cold_leads: 0,
  messages_sent: 0, responses: 0, estimated_pipeline_value: 0,
  conversion_rate: 0, revenue_forecast: 0,
  high_priority_leads: 0, leads_ready_to_contact: 0,
  avg_quality_score: 0, avg_conversion_probability: 0,
  pipeline_counts: {},
  top_lead: null,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.get()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const intelCards = [
    { label: 'High Priority', value: data.high_priority_leads, icon: AlertTriangle, color: 'from-red-500 to-rose-700', accent: 'text-red-400' },
    { label: 'Ready to Contact', value: data.leads_ready_to_contact, icon: BellRing, color: 'from-amber-400 to-orange-600', accent: 'text-amber-400' },
    { label: 'Avg Quality Score', value: `${data.avg_quality_score}`, icon: BrainCircuit, color: 'from-emerald-400 to-teal-700', accent: 'text-emerald-400' },
    { label: 'Avg Conv. Probability', value: `${(data.avg_conversion_probability * 100).toFixed(1)}%`, icon: Sparkles, color: 'from-violet-400 to-purple-700', accent: 'text-violet-400' },
  ];

  const cards = [
    { label: 'Total Leads', value: data.total_leads, icon: Users, color: 'from-zinc-700 to-zinc-900' },
    { label: 'Hot Leads', value: data.hot_leads, icon: Zap, color: 'from-red-500 to-orange-600' },
    { label: 'Warm Leads', value: data.warm_leads, icon: Target, color: 'from-amber-400 to-yellow-600' },
    { label: 'Messages Sent', value: data.messages_sent, icon: MessageSquare, color: 'from-emerald-400 to-green-700' },
    { label: 'Responses', value: data.responses, icon: TrendingUp, color: 'from-violet-400 to-purple-700' },
    { label: 'Pipeline Value', value: formatCurrency(data.estimated_pipeline_value), icon: DollarSign, color: 'from-cyan-400 to-teal-700' },
    { label: 'Conversion Rate', value: `${data.conversion_rate}%`, icon: TrendingUp, color: 'from-blue-400 to-indigo-700' },
    { label: 'Revenue Forecast', value: formatCurrency(data.revenue_forecast), icon: DollarSign, color: 'from-emerald-300 to-emerald-700' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-premium-glow pointer-events-none" />
        <div className="relative max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400 font-semibold">{PRODUCT.productName}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100">
            Turn local signals into global revenue intelligence.
          </h1>
          <p className="mt-3 text-sm text-zinc-400 leading-6">
            Discover prospects, score digital maturity, generate authentic outreach, and track replies from one premium command center.
          </p>
        </div>
      </div>

      {/* Predictive Intelligence Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {intelCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800/50 shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br ${card.color} p-2 rounded-lg shadow`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{card.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${card.accent}`}>{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl hover-premium">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{card.label}</p>
                  <p className="text-2xl font-bold mt-1 text-zinc-100">{card.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${card.color} p-3 rounded-xl shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
          <h3 className="font-semibold text-zinc-100 mb-5">Pipeline Funnel</h3>
          {Object.keys(data.pipeline_counts).length > 0 ? (
            <div className="space-y-2">
              {[
                { key: 'discovered', label: 'Discovered', color: 'bg-zinc-600' },
                { key: 'analyzed', label: 'Analyzed', color: 'bg-blue-500' },
                { key: 'approved', label: 'Approved', color: 'bg-amber-500' },
                { key: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
                { key: 'responded', label: 'Responded', color: 'bg-emerald-500' },
                { key: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-teal-500' },
                { key: 'converted', label: 'Converted', color: 'bg-emerald-400' },
                { key: 'disqualified', label: 'Disqualified', color: 'bg-red-400' },
              ].map((stage, idx) => {
                const count = data.pipeline_counts[stage.key] || 0;
                const maxCount = Math.max(...Object.values(data.pipeline_counts), 1);
                const barWidth = (count / maxCount) * 100;
                const prevKey = ['discovered','analyzed','approved','contacted','responded','meeting_scheduled','converted','disqualified'][idx - 1];
                const prevCount = prevKey ? (data.pipeline_counts[prevKey] || 0) : data.total_leads;
                const dropoff = prevCount > 0 ? Math.round((1 - count / prevCount) * 100) : 0;
                return (
                  <div key={stage.key} className="flex items-center gap-4">
                    <div className="w-32 text-right shrink-0">
                      <span className="text-xs text-zinc-400 capitalize">{stage.label}</span>
                    </div>
                    <div className="flex-1 h-8 rounded-lg bg-zinc-800/60 overflow-hidden relative group">
                      <div
                        className={`h-full rounded-lg ${stage.color} transition-all duration-500 ease-out opacity-80`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                        <span className="text-xs font-bold text-zinc-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{count}</span>
                      </div>
                    </div>
                    <div className="w-16 shrink-0">
                      {idx > 0 && idx < 7 && dropoff > 0 && (
                        <span className="text-[10px] text-red-400">-{dropoff}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">No leads in pipeline yet</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Top Priority Lead */}
          {data.top_lead && (
            <Link href={`/leads?id=${data.top_lead.id}`}>
              <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 to-zinc-900 border border-amber-500/30 shadow-xl hover-premium cursor-pointer">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Top Priority Lead</span>
                </div>
                <p className="text-lg font-bold text-zinc-100 truncate">{data.top_lead.business_name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{data.top_lead.industry} &middot; {data.top_lead.category_flag}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-zinc-800/60 p-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Quality</p>
                    <p className="text-sm font-bold text-emerald-400">{Math.round(data.top_lead.quality_score)}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 p-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Conversion</p>
                    <p className="text-sm font-bold text-amber-400">{(data.top_lead.conversion_probability * 100).toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg bg-zinc-800/60 p-2">
                    <p className="text-[10px] text-zinc-500 uppercase">Urgency</p>
                    <p className={`text-sm font-bold ${data.top_lead.buying_urgency >= 70 ? 'text-red-400' : 'text-zinc-300'}`}>
                      {data.top_lead.buying_urgency >= 70 ? 'NOW' : Math.round(data.top_lead.buying_urgency)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-zinc-600">Best channel: <span className="text-zinc-300 capitalize">{data.top_lead.optimal_channel}</span></span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </Link>
          )}

          <ActivityFeed />
      </div>
      </div>
    </div>
  );
}
