import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Play, Square, RefreshCw, ExternalLink } from 'lucide-react';

interface Stats {
  m: string; d: string; u: string; p: number;
  bak: string; t: boolean; s: boolean; neb: boolean;
  c: number; l: string;
}

interface ServicesTableProps {
  stats: Stats | null;
  onToggle: (svc: string) => void;
}

const services = [
  { key: 'ssh', label: 'OpenSSH Server', desc: 'Remote shell access' },
  { key: 'tun', label: 'Cloudflare Tunnel', desc: 'Public HTTPS ingress' },
  { key: 'neb', label: 'Nebula Mesh VPN', desc: 'Peer-to-peer overlay' },
  { key: 'caddy', label: 'Caddy', desc: 'Reverse proxy & TLS' },
  { key: 'restic', label: 'Backups (restic)', desc: 'Automated snapshots' },
  { key: 'leads', label: 'Leads Backend', desc: 'Lead intelligence API' },
];

export function ServicesTable({ stats, onToggle }: ServicesTableProps) {
  const getStatus = (key: string) => {
    if (!stats) return { variant: 'pending' as const, text: 'Scanning...' };
    switch (key) {
      case 'ssh': return stats.s
        ? { variant: 'running' as const, text: 'Running' }
        : { variant: 'stopped' as const, text: 'Stopped' };
      case 'tun': return stats.t
        ? { variant: 'running' as const, text: 'Connected' }
        : { variant: 'stopped' as const, text: 'Disconnected' };
      case 'neb': return stats.neb
        ? { variant: 'running' as const, text: 'Connected' }
        : { variant: 'stopped' as const, text: 'Stopped' };
      case 'caddy': return { variant: 'pending' as const, text: 'Checking...' };
      case 'restic': return stats.bak && stats.bak !== 'na'
        ? { variant: 'info' as const, text: `Last: ${stats.bak}` }
        : { variant: 'neutral' as const, text: 'Not configured' };
      case 'leads':
        if (stats.l === 'running') return { variant: 'running' as const, text: 'Running' };
        if (stats.l === 'starting') return { variant: 'pending' as const, text: 'Starting...' };
        if (stats.l === 'not_installed') return { variant: 'neutral' as const, text: 'Not Installed' };
        return { variant: 'stopped' as const, text: stats.l };
      default: return { variant: 'neutral' as const, text: 'Unknown' };
    }
  };

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
            {services.map(({ key, label, desc }, i) => {
              const st = getStatus(key);
              const isRunning = st.variant === 'running';
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
