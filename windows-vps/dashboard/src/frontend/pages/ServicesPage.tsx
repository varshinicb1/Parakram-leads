import { useStats } from '../hooks/use-stats';
import { TopBar } from '../components/TopBar';
import { ServicesTable } from '../components/ServicesTable';
import { Card, CardContent } from '../components/ui/card';
import { Server, Activity, Wifi, Shield } from 'lucide-react';

export function ServicesPage() {
  const { stats, connected, logs, addLog, refresh } = useStats();

  const handleToggle = async (svc: string) => {
    await fetch(`/a/t/${svc}`);
    addLog(`Toggled: ${svc}`);
    setTimeout(refresh, 1500);
  };

  const serviceCounts = {
    running: 0,
    stopped: 0,
    total: 6,
  };

  if (stats) {
    if (stats.s) serviceCounts.running++;
    else serviceCounts.stopped++;
    if (stats.t) serviceCounts.running++;
    else serviceCounts.stopped++;
    if (stats.neb) serviceCounts.running++;
    else serviceCounts.stopped++;
    if (stats.l === 'running') serviceCounts.running++;
    else serviceCounts.stopped++;
    serviceCounts.stopped += 2;
    serviceCounts.running = serviceCounts.total - serviceCounts.stopped;
  }

  return (
    <>
      <TopBar connected={connected} hostname={window.location.hostname} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">Services</h1>
              <p className="text-sm text-text-muted mt-0.5">Manage and monitor system services</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10">
                    <Server className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{serviceCounts.total}</div>
                    <div className="text-xs text-text-muted">Total Services</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-success/10">
                    <Activity className="h-5 w-5 text-success" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{serviceCounts.running}</div>
                    <div className="text-xs text-text-muted">Running</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-danger/10">
                    <Shield className="h-5 w-5 text-danger" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{serviceCounts.stopped}</div>
                    <div className="text-xs text-text-muted">Stopped</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-info/10">
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
