import { useEffect, useState, useCallback, useRef } from 'react';

export interface Stats {
  m: string; d: string; u: string; p: number;
  bak: string;
  t: 'running' | 'stopped' | 'not_installed';
  s: 'running' | 'stopped' | 'not_installed';
  neb: 'running' | 'stopped' | 'not_installed';
  caddy: 'running' | 'stopped' | 'not_installed';
  restic: 'running' | 'stopped' | 'not_installed';
  c: number;
  l: 'running' | 'stopped' | 'not_installed';
}

const MAX_HISTORY = 60;

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [connected, setConnected] = useState(true);
  const [history, setHistory] = useState<{ cpu: number[]; mem: number[] }>({ cpu: [], mem: [] });
  const [logs, setLogs] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
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

  return {
    stats,
    connected,
    history,
    memPct,
    logs,
    addLog,
    clearLogs,
    refresh: poll,
  };
}
