import { useRef, useEffect } from 'react';
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

export function LogPanel({ logs, onClear, title = 'System Events' }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className="rounded-[16px] border border-border bg-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-[0.12em]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted tabular-nums">{logs.length} events</span>
          {onClear && (
            <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-muted text-[11px]">No events yet. Waiting for activity...</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((log, i) => {
              const [ts, ...rest] = log.match(/\[(.*?)\]\s(.*)/)?.slice(1) ?? ['', log];
              return (
                <div key={i} className="flex gap-3 py-0.5 group hover:bg-hover/30 rounded-[4px] px-1 -mx-1 transition-colors">
                  <span className="shrink-0 text-text-muted/50 tabular-nums">{ts}</span>
                  <span className={cn(logColor(rest[0] || ''), 'break-all')}>
                    {rest[0] || log}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
