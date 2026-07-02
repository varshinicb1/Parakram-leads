import { TopBar } from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useStats } from '../hooks/use-stats';
import { RefreshCw, Cloud, Terminal, Shield } from 'lucide-react';

export function SettingsPage() {
  const { stats, connected, refresh } = useStats();

  const handleRestart = async (target: string) => {
    await fetch(`/a/r/${target}`);
    setTimeout(refresh, 2000);
  };

  return (
    <>
      <TopBar connected={connected} hostname={window.location.hostname} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-text-primary tracking-tight">Settings</h1>
            <p className="text-sm text-text-muted mt-0.5">System configuration and management</p>
          </div>

          <div className="space-y-3 max-w-xl">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accent/10">
                      <RefreshCw className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Restart Dashboard</div>
                      <div className="text-xs text-text-muted mt-0.5">Reload the dashboard backend service</div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleRestart('dashboard')}>
                    Restart
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-info/10">
                      <Terminal className="h-5 w-5 text-info" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Provision Host</div>
                      <div className="text-xs text-text-muted mt-0.5">Re-run OpenSSH + Cloudflare Tunnel setup</div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleRestart('provision')}>
                    Run
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-danger/10">
                      <Shield className="h-5 w-5 text-danger" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">Deprovision Host</div>
                      <div className="text-xs text-text-muted mt-0.5">Remove OpenSSH, Cloudflare Tunnel, and firewall rules</div>
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleRestart('deprovision')}>
                    Deprovision
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
