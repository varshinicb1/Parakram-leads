import { useEffect, useState, useCallback, useRef } from 'react';
import { MetricCard } from '../components/MetricCard';
import { ServicesTable } from '../components/ServicesTable';
import { LogPanel } from '../components/LogPanel';

interface Stats {
  m: string; d: string; u: string; p: number;
  bak: string; t: boolean; s: boolean; neb: boolean;
  c: number; l: string;
}

const MAX_HISTORY = 60;

export function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [connected, setConnected] = useState(true);
  const [history, setHistory] = useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const parseMemPct = (m: string) => {
    const used = parseFloat(m.match(/^([\d.]+)/)?.[1] || '0');
    const total = parseFloat(m.match(/\/\s*([\d.]+)/)?.[1] || '1');
    return total > 0 ? Math.min((used / total) * 100, 100) : 0;
  };

  const poll = useCallback(async () => {
    try {
      const r = await fetch('/a/s');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: Stats = await r.json();
      setStats(d);
      setConnected(true);

      setHistory(prev => {
        const cpu = [...prev.cpu, d.c].slice(-MAX_HISTORY);
        const mem = [...prev.mem, parseMemPct(d.m)].slice(-MAX_HISTORY);
        return { cpu, mem };
      });

      if (d.c > 90) addLog(`⚠ High CPU: ${d.c.toFixed(0)}%`);
    } catch {
      setConnected(false);
    }
  }, [addLog]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 4000);
    addLog('Dashboard initialized');
    return () => clearInterval(pollRef.current);
  }, [poll, addLog]);

  const memPct = stats ? parseMemPct(stats.m) : 0;

  return (
    <div className="h-screen flex flex-col bg-[#070708] text-[#e8e6e3]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[#c9a96e] tracking-wider">
            PARAKRAM VPS <span className="text-[10px] text-[#5a5a5a] font-normal ml-1">Mission Control v3.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5a5a5a] font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <span className="text-[11px] text-[#5a5a5a] font-mono" id="hostname">{window.location.hostname}</span>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-2.5 px-6 py-3 shrink-0">
        <MetricCard label="CPU" value={stats ? `${stats.c.toFixed(0)}%` : '—'} sub="utilization" pct={stats?.c || 0} sparkline={history.cpu} />
        <MetricCard label="Memory" value={stats ? `${memPct.toFixed(0)}%` : '—'} sub={stats?.m?.replace('GB', 'GB') || 'used / total'} pct={memPct} sparkline={history.mem} />
        <MetricCard label="Disk" value={stats ? `${((parseFloat(stats.d.match(/^([\d.]+)/)?.[1] || '0') / parseFloat(stats.d.match(/\/\s*([\d.]+)/)?.[1] || '1')) * 100).toFixed(0)}%` : '—'} sub={stats?.d || 'used / total'} pct={stats ? (parseFloat(stats.d.match(/^([\d.]+)/)?.[1] || '0') / parseFloat(stats.d.match(/\/\s*([\d.]+)/)?.[1] || '1')) * 100 : 0} />
        <MetricCard label="Uptime" value={stats?.u || '—'} sub="since boot" />
        <MetricCard label="Network" value={stats?.t ? 'Active' : 'Offline'} sub={stats?.t ? 'tunnel connected' : 'tunnel disconnected'} />
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-2 gap-3 px-6 pb-4 overflow-hidden">
        <ServicesTable stats={stats} onToggle={async (svc) => {
          await fetch(`/a/t/${svc}`);
          addLog(`Toggled: ${svc}`);
          setTimeout(poll, 1500);
        }} />
        <LogPanel logs={logs} />
      </div>

      {/* Footer */}
      <footer className="flex gap-2 px-6 py-3 border-t border-[rgba(255,255,255,0.06)] shrink-0">
        <a href="https://dash.cloudflare.com" target="_blank" rel="noopener"
          className="px-4 py-2 rounded-lg text-xs border border-[rgba(255,255,255,0.06)] bg-[#0d0d0e] text-[#e8e6e3] hover:border-[#c9a96e] transition-colors no-underline inline-flex items-center gap-1.5">
          ☁ Cloudflare
        </a>
        <button onClick={() => addLog('Diagnostics exported')}
          className="px-4 py-2 rounded-lg text-xs border border-[rgba(255,255,255,0.06)] bg-[#0d0d0e] text-[#e8e6e3] hover:border-[#c9a96e] transition-colors cursor-pointer">
          📋 Export Diagnostics
        </button>
        <a href="https://leads.getparakram.in" target="_blank" rel="noopener"
          className="px-4 py-2 rounded-lg text-xs border border-[rgba(255,255,255,0.06)] bg-[#0d0d0e] text-[#e8e6e3] hover:border-[#c9a96e] transition-colors no-underline inline-flex items-center gap-1.5">
          📊 Leads Dashboard
        </a>
        <div className="flex-1" />
        <button onClick={() => location.reload()}
          className="px-4 py-2 rounded-lg text-xs border border-[rgba(255,255,255,0.06)] bg-[#0d0d0e] text-[#e8e6e3] hover:border-[#c9a96e] transition-colors cursor-pointer">
          ⟳ Refresh
        </button>
      </footer>
    </div>
  );
}
