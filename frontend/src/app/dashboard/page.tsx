'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Users, MessageSquare, TrendingUp, DollarSign, Target, Zap,
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
}

const defaultData: DashboardData = {
  total_leads: 0, hot_leads: 0, warm_leads: 0, cold_leads: 0,
  messages_sent: 0, responses: 0, estimated_pipeline_value: 0,
  conversion_rate: 0, revenue_forecast: 0,
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

  const cards = [
    { label: 'Total Leads', value: data.total_leads, icon: Users, color: 'bg-blue-500' },
    { label: 'Hot Leads', value: data.hot_leads, icon: Zap, color: 'bg-red-500' },
    { label: 'Warm Leads', value: data.warm_leads, icon: Target, color: 'bg-amber-500' },
    { label: 'Messages Sent', value: data.messages_sent, icon: MessageSquare, color: 'bg-green-500' },
    { label: 'Responses', value: data.responses, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Pipeline Value', value: `₹${(data.estimated_pipeline_value).toLocaleString()}`, icon: DollarSign, color: 'bg-teal-500' },
    { label: 'Conversion Rate', value: `${data.conversion_rate}%`, icon: TrendingUp, color: 'bg-indigo-500' },
    { label: 'Revenue Forecast', value: `₹${(data.revenue_forecast).toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sigma-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Lead Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Hot', count: data.hot_leads, color: 'bg-red-500', total: data.total_leads },
              { label: 'Warm', count: data.warm_leads, color: 'bg-amber-500', total: data.total_leads },
              { label: 'Cold', count: data.cold_leads, color: 'bg-gray-300', total: data.total_leads },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-500">{item.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {[
              { label: 'Response Rate', value: `${data.conversion_rate}%`, sub: `${data.responses} responses from ${data.messages_sent} messages` },
              { label: 'Pipeline Value', value: `₹${data.estimated_pipeline_value.toLocaleString()}`, sub: 'Estimated total opportunity value' },
              { label: 'Revenue Forecast', value: `₹${data.revenue_forecast.toLocaleString()}`, sub: 'Projected based on conversion rate' },
            ].map((item) => (
              <div key={item.label} className="border-b border-gray-100 pb-3 last:border-0">
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-xl font-bold text-gray-800">{item.value}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
