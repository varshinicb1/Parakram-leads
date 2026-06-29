'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Bell, AlertTriangle, X, Sparkles, BrainCircuit, ArrowRight,
  Phone, Mail, MessageSquare,
} from 'lucide-react';

const channelIcon: Record<string, any> = {
  whatsapp: MessageSquare,
  email: Mail,
  phone: Phone,
  linkedin: MessageSquare,
};

export default function AlertNotifications() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<any>({ alerts: [], urgent_leads: [], total_urgent: 0 });
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const fetchAlerts = async () => {
    try {
      const data = await api.intelligence.alerts(5);
      if (data.total_urgent > 0) setHasNew(true);
      setAlerts(data);
    } catch {}
  };

  useEffect(() => {
    fetchAlerts();
    pollRef.current = setInterval(fetchAlerts, 60000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (hasNew) setHasNew(false);
    if (!open) fetchAlerts();
  };

  const totalAlerts = alerts.alerts.length + alerts.urgent_leads.length;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {(hasNew || totalAlerts > 0) && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#fbbf24]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-zinc-200">Alerts</span>
            </div>
            {alerts.total_urgent > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full">
                {alerts.total_urgent} urgent
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400" />
              </div>
            ) : totalAlerts === 0 ? (
              <div className="py-8 text-center">
                <BrainCircuit className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No alerts yet</p>
                <p className="text-[10px] text-zinc-700 mt-1">Alerts appear when high-urgency leads are detected</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {/* Urgent Leads */}
                {alerts.urgent_leads?.slice(0, 5).map((lead: any) => {
                  const ChIcon = channelIcon[lead.optimal_channel] || MessageSquare;
                  return (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
                          {lead.business_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-red-400 font-semibold">{Math.round(lead.buying_urgency)} urgency</span>
                          <span className="text-[10px] text-zinc-600">·</span>
                          <ChIcon className="w-3 h-3 text-zinc-600" />
                          <span className="text-[10px] text-zinc-600 capitalize">{lead.optimal_channel}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${Math.min(lead.buying_urgency, 100)}%` }}
                            />
                          </div>
                          <ArrowRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Alert Records */}
                {alerts.alerts?.map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">{alert.message}</p>
                      {alert.created_at && (
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-zinc-800">
            <Link
              href="/messages"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              View all messages <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
