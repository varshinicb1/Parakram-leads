'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
import { Sparkles, Key, Mail, Globe, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      setToken(res.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070708] bg-premium-glow p-4 relative overflow-hidden">
      {/* Abstract light beam decorations for Apple premium look */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#d4af37]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md p-10 dark-glass rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-800/80 z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Parakram Suite
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-zinc-200">Parakram </span>
            <span className="text-gradient-gold">Leads</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium">Autonomous Lead Discovery & Outreach</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d0d0e] border border-zinc-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-zinc-600"
              placeholder="name@parakram.co"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-500" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d0d0e] border border-zinc-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 text-zinc-100 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder-zinc-600"
              placeholder="••••••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-semibold rounded-xl hover:shadow-[0_0_20px_rgba(245,181,37,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
              ) : (
                'Unlock Enterprise Access'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-zinc-800/80 pt-6 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-zinc-600" />
            Global Compliance
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-zinc-600" />
            Military-grade Security
          </span>
        </div>
      </div>
    </div>
  );
}