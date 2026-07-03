import { useStats } from '../hooks/use-stats';
import { MetricCard } from '../components/MetricCard';
import { ServicesTable } from '../components/ServicesTable';
import { LogPanel } from '../components/LogPanel';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/ui/button';
import { RefreshCw, ExternalLink, Download, Cpu, MemoryStick, HardDrive, Clock, Network } from 'lucide-react';

export function Dashboard() {
  const { stats, connected, history, memPct, logs, addLog, refresh } = useStats();

  const diskPct = stats
    ? ((parseFloat(stats.d.match(/^([\d.]+)/)?.[1] || '0') /
        parseFloat(stats.d.match(/\/\s*([\d.]+)/)?.[1] || '1')) * 100)
    : 0;

  const handleToggle = async (svc: string) => {
    try {
      await fetch(`/a/t/${svc}`);
      addLog(`Toggled: ${svc}`);
    } catch {
      addLog(`✗ Failed to toggle: ${svc}`);
    }
    setTimeout(refresh, 1500);
  };

  return (
    <>
      <TopBar connected={connected} hostname={window.location.hostname} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 animate-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">Overview</h1>
              <p className="text-sm text-text-muted mt-0.5">Real-time system metrics and service status</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => { addLog('Diagnostics exported'); }}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                Export
              </Button>
              <Button variant="secondary" size="sm" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            <MetricCard
              label="CPU"
              value={stats ? `${stats.c.toFixed(0)}%` : '—'}
              sub="utilization"
              pct={stats?.c ?? 0}
              sparkline={history.cpu}
              icon={<Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />}
            />
            <MetricCard
              label="Memory"
              value={stats ? `${memPct.toFixed(0)}%` : '—'}
              sub={stats?.m?.replace('GB', ' GB') || '—'}
              pct={stats ? memPct : 0}
              sparkline={history.mem}
              icon={<MemoryStick className="h-3.5 w-3.5" strokeWidth={1.5} />}
            />
            <MetricCard
              label="Disk"
              value={stats ? `${diskPct.toFixed(0)}%` : '—'}
              sub={stats?.d || '—'}
              pct={diskPct}
              icon={<HardDrive className="h-3.5 w-3.5" strokeWidth={1.5} />}
            />
            <MetricCard
              label="Uptime"
              value={stats?.u || '—'}
              sub="since boot"
              icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.5} />}
            />
            <MetricCard
              label="Network"
              value={stats?.t === 'running' ? 'Active' : '—'}
              sub={stats?.t === 'running' ? 'tunnel connected' : '—'}
              icon={<Network className="h-3.5 w-3.5" strokeWidth={1.5} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 h-[400px]">
            <ServicesTable stats={stats} onToggle={handleToggle} />
            <LogPanel logs={logs} />
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => window.open('https://dash.cloudflare.com', '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cloudflare Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open('https://leads.getparakram.in', '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              Leads Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
