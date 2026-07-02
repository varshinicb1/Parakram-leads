import { ScrollText, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface LogPanelProps {
  logs: string[];
  onClear?: () => void;
  title?: string;
}

function logColor(msg: string) {
  if (msg.includes('⚠')) return 'text-warning';
  if (msg.includes('✗') || msg.includes('error') || msg.includes('fail')) return 'text-danger';
  if (msg.includes('✓') || msg.includes('success') || msg.includes('initialized')) return 'text-success';
  if (msg.includes('→') || msg.includes('starting') || msg.includes('stopping')) return 'text-info';
  return '';
}

function Skeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="p-6 space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-3 w-full" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    </div>
  );
}

export function LogPanel({ logs, onClear, title = 'System Events' }: LogPanelProps) {
  if (!logs) return <Skeleton />;

  return (
    <div className="rounded-[16px] border border-border bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-[0.12em]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted tabular-nums">{logs.length} events</span>
          {onClear && logs.length > 0 && (
            <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7" title="Clear logs">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <ScrollText className="h-5 w-5 opacity-30" strokeWidth={1} />
            <span className="text-[11px]">Waiting for system events...</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, i) => {
              const parts = log.match(/\[(.*?)\]\s(.*)/);
              const ts = parts?.[1] ?? '';
              const msg = parts?.[2] ?? log;
              return (
                <div
                  key={i}
                  className="flex gap-3 py-0.5 rounded-[4px] px-1 -mx-1 transition-colors hover:bg-hover/30"
                  style={{ animation: `fade-in 0.2s ease-out both`, animationDelay: `${Math.min(i * 15, 300)}ms` }}
                >
                  <span className="shrink-0 text-text-muted/50 tabular-nums">{ts}</span>
                  <span className={cn(logColor(msg), 'break-all')}>{msg}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
