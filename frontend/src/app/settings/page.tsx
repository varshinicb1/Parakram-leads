'use client';

import React, { useState } from 'react';
import { Save, Key, Mail, Phone, Bell, Cpu, Globe2, ShieldCheck, Sparkles, Linkedin } from 'lucide-react';
import { CORE_STACK, PRICING_TIERS, PRODUCT } from '@/lib/product';
import { formatCurrency } from '@/lib/format';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    openai_key: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    twilio_sid: '',
    twilio_token: '',
    twilio_phone: '',
    whatsapp_key: '',
    whatsapp_phone_id: '',
    alert_phone: '',
    alert_email: '',
    linkedin_email: '',
    linkedin_password: '',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      title: 'AI Intelligence',
      subtitle: 'OpenAI-compatible LLM routing for scoring, insight generation, and outreach personalization.',
      icon: Key,
      fields: [
        { key: 'openai_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
      ],
    },
    {
      title: 'Email Delivery',
      subtitle: 'SMTP fallback for broad global compatibility. Add SendGrid/SES at backend level for scale.',
      icon: Mail,
      fields: [
        { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
        { key: 'smtp_port', label: 'Port', type: 'text', placeholder: '587' },
        { key: 'smtp_user', label: 'Username', type: 'text', placeholder: 'you@example.com' },
        { key: 'smtp_password', label: 'Password', type: 'password', placeholder: 'App password' },
      ],
    },
    {
      title: 'SMS Alerts',
      subtitle: 'Twilio-compatible alerts for reply notifications and high-priority lead movement.',
      icon: Phone,
      fields: [
        { key: 'twilio_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
        { key: 'twilio_token', label: 'Auth Token', type: 'password', placeholder: '...' },
        { key: 'twilio_phone', label: 'Phone Number', type: 'text', placeholder: '+1234567890' },
      ],
    },
    {
      title: 'WhatsApp Outreach',
      subtitle: 'Official Business API or bridge-based messaging for compliant regional outreach.',
      icon: Phone,
      fields: [
        { key: 'whatsapp_key', label: 'API Key', type: 'password', placeholder: '...' },
        { key: 'whatsapp_phone_id', label: 'Phone Number ID', type: 'text', placeholder: '...' },
      ],
    },
    {
      title: 'LinkedIn Outreach',
      subtitle: 'Browser-automated LinkedIn messaging via Playwright. Requires LinkedIn account credentials.',
      icon: Linkedin,
      fields: [
        { key: 'linkedin_email', label: 'LinkedIn Email', type: 'email', placeholder: 'you@linkedin.com' },
        { key: 'linkedin_password', label: 'LinkedIn Password', type: 'password', placeholder: 'Your LinkedIn password' },
      ],
    },
    {
      title: 'Personal Alerts',
      subtitle: 'Notify founders and operators instantly when a buyer responds.',
      icon: Bell,
      fields: [
        { key: 'alert_phone', label: 'Alert Phone', type: 'text', placeholder: '+1234567890' },
        { key: 'alert_email', label: 'Alert Email', type: 'email', placeholder: 'you@example.com' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-premium-glow pointer-events-none" />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400 font-semibold">Core Product Strategy</p>
            <h1 className="mt-3 text-3xl font-bold text-zinc-100">{PRODUCT.productName} is built as a global SaaS operating system.</h1>
            <p className="mt-3 text-sm text-zinc-400 leading-6 max-w-3xl">
              The web app stays on Next.js and React because this is an authenticated, data-heavy, interactive platform. Astro is excellent for marketing sites, but this product needs application state, live tables, dashboards, auth, and a clear React Native path later.
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <Globe2 className="w-5 h-5 text-amber-400" />
              Worldwide Ready
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Default currency: {PRODUCT.defaultCurrency}. Locale-aware formatting. Multi-region messaging and compliance-ready architecture.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
                <div className="flex items-start gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">{section.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{section.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        value={(settings as any)[field.key]}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full bg-[#0d0d0e] border border-zinc-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 text-zinc-100 rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder-zinc-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-zinc-100">Open-Source npm Core Stack</h3>
            </div>
            <div className="space-y-3">
              {CORE_STACK.map((item) => (
                <div key={item.name} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-sm font-semibold text-zinc-200">{item.name}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-5">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-zinc-100">Global Pricing Foundation</h3>
            </div>
            <div className="space-y-3">
              {PRICING_TIERS.map((tier) => (
                <div key={tier.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{tier.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">{tier.audience}</p>
                    </div>
                    <p className="text-sm font-bold text-amber-400 whitespace-nowrap">
                      {tier.priceMonthly === null ? 'Custom' : `${formatCurrency(tier.priceMonthly)}/mo`}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {tier.leadLimit ? `${tier.leadLimit.toLocaleString()} leads` : 'Unlimited leads'} · {tier.aiCredits ? `${tier.aiCredits.toLocaleString()} AI credits` : 'Custom AI volume'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-zinc-900/80 border border-zinc-800 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-zinc-100">Authenticity Moat</h3>
            </div>
            <p className="mt-3 text-sm text-zinc-500 leading-6">
              The product should win by being useful immediately: fewer fake leads, clearer digital-gap scoring, faster outreach, transparent reply tracking, and operator-level alerts when buyers respond.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black rounded-xl font-semibold hover:shadow-[0_0_20px_rgba(245,181,37,0.35)] active:scale-[0.98] transition-all"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
