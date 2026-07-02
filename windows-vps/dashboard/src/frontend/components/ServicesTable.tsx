import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Play, Square, RefreshCw } from 'lucide-react';
import type { Stats } from '../hooks/use-stats';

interface ServicesTableProps {
  stats: Stats | null;
  onToggle: (svc: string) => void;
}

type ServiceStatus = 'running' | 'stopped' | 'not_installed' | 'checking';

const services = [
  { key: 'ssh', label: 'OpenSSH Server', desc: 'Remote shell access' },
  { key: 'tun', label: 'Cloudflare Tunnel', desc: 'Public HTTPS ingress' },
  { key: 'neb', label: 'Nebula Mesh VPN', desc: 'Peer-to-peer overlay network' },
  { key: 'caddy', label: 'Caddy', desc: 'Reverse proxy with auto TLS' },
  { key: 'restic', label: 'Backups (restic)', desc: 'Automated encrypted snapshots' },
  { key: 'leads', label: 'Leads Backend', desc: 'Lead intelligence API' },
];

function badgeFromStatus(st: ServiceStatus): { variant: 'running' | 'stopped' | 'pending' | 'neutral' | 'info'; text: string } {
  switch (st) {
    case 'running': return { variant: 'running', text: 'Running' };
    case 'stopped': return { variant: 'stopped', text: 'Stopped' };
    case 'not_installed': return { variant: 'neutral', text: 'Not Installed' };
    case 'checking': return { variant: 'pending', text: 'Checking...' };
  }
}

function Skeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-6 w-20 rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServicesTable({ stats, onToggle }: ServicesTableProps) {
  const getStatus = (key: string): ServiceStatus => {
    if (!stats) return 'checking';
    switch (key) {
      case 'ssh': return stats.s;
      case 'tun': return stats.t;
      case 'neb': return stats.neb;
      case 'caddy': return stats.caddy ?? 'checking';
      case 'restic': return stats.restic ?? 'checking';
      case 'leads': return stats.l;
      default: return 'not_installed';
    }
  };

  if (!stats) return <Skeleton />;

  return (
    <div className="rounded-[16px] border border-border bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-[0.12em]">Services</h3>
        <span className="text-[11px] text-text-muted tabular-nums">{services.length} services</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Service</th>
              <th className="text-left px-6 py-3 text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Status</th>
              <th className="text-right px-6 py-3 text-[11px] font-medium text-text-muted uppercase tracking-[0.08em]">Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map(({ key, label, desc }) => {
              const st = badgeFromStatus(getStatus(key));
              const isRunning = st.variant === 'running';
              const isNotInstalled = st.variant === 'neutral';
              return (
                <tr
                  key={key}
                  className="group border-b border-border/50 last:border-b-0 transition-colors hover:bg-hover/50"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">{label}</span>
                      <span className="text-xs text-text-muted mt-0.5">{desc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={st.variant} dot>{st.text}</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {!isNotInstalled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggle(key)}
                      >
                        {key === 'restic' ? (
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : isRunning ? (
                          <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        {key === 'restic' ? 'Run' : isRunning ? 'Stop' : 'Start'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
