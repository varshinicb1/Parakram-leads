import { useStats } from '../hooks/use-stats';
import { TopBar } from '../components/TopBar';
import { LogPanel } from '../components/LogPanel';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export function LogsPage() {
  const { stats, connected, logs, clearLogs } = useStats();

  const errorCount = logs.filter(l => l.includes('✗') || l.includes('error') || l.includes('fail')).length;
  const warnCount = logs.filter(l => l.includes('⚠')).length;

  return (
    <>
      <TopBar connected={connected} hostname={window.location.hostname} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">System Logs</h1>
              <p className="text-sm text-text-muted mt-0.5">Real-time event stream and activity history</p>
            </div>
            <Button variant="danger" size="sm" onClick={clearLogs}>
              <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
              Clear Events
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-success/10">
                    <CheckCircle className="h-5 w-5 text-success" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{logs.length}</div>
                    <div className="text-xs text-text-muted">Total Events</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-warning/10">
                    <AlertTriangle className="h-5 w-5 text-warning" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{warnCount}</div>
                    <div className="text-xs text-text-muted">Warnings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-danger/10">
                    <XCircle className="h-5 w-5 text-danger" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-text-primary tabular-nums">{errorCount}</div>
                    <div className="text-xs text-text-muted">Errors</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="h-[500px]">
            <LogPanel logs={logs} onClear={clearLogs} title="Event Stream" />
          </div>
        </div>
      </div>
    </>
  );
}
