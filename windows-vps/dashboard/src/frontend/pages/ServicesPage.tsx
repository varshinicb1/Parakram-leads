import { useStats } from '../hooks/use-stats';
import { TopBar } from '../components/TopBar';
import { ServicesTable } from '../components/ServicesTable';
import { Card, CardContent } from '../components/ui/card';
import { Server, Activity, Shield, Wifi } from 'lucide-react';

export function ServicesPage() {
  const { stats, connected, logs, addLog, refresh } = useStats();

  const handleToggle = async (svc: string) => {
    await fetch(`/a/t/${svc}`);
    addLog(`Toggled: ${svc}`);
    setTimeout(refresh, 1500);
  };

  const svcList = [
    { key: 'ssh', label: 'OpenSSH' },
    { key: 'tun', label: 'Cloudflare Tunnel' },
    { key: 'neb', label: 'Nebula VPN' },
    { key: 'caddy', label: 'Caddy' },
    { key: 'restic', label: 'Backups' },
    { key: 'leads', label: 'Leads Backend' },
  ];

  let running = 0;
  let stopped = 0;
  let notInstalled = 0;

  if (stats) {
    for (const { key } of svcList) {
      const val = (stats as Record<string, unknown>)[key];
      if (val === 'running') running++;
      else if (val === 'stopped') stopped++;
      else notInstalled++;
    }
  }

  return (
    <>
      <TopBar connected={connected} hostname={window.location.hostname} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 animate-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">Services</h1>
              <p className="text-sm text-text-muted mt-0.5">Manage and monitor system services</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent/10">
                    <Server className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{svcList.length}</div>
                    <div className="text-xs text-text-muted">Total Services</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-success/10">
                    <Activity className="h-5 w-5 text-success" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{running}</div>
                    <div className="text-xs text-text-muted">Running</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-danger/10">
                    <Shield className="h-5 w-5 text-danger" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{stopped + notInstalled}</div>
                    <div className="text-xs text-text-muted">Inactive</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-info/10">
                    <Wifi className="h-5 w-5 text-info" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{connected ? '1' : '0'}</div>
                    <div className="text-xs text-text-muted">Active Tunnels</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="h-[500px]">
            <ServicesTable stats={stats} onToggle={handleToggle} />
          </div>
        </div>
      </div>
    </>
  );
}
