interface LogPanelProps {
  logs: string[];
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <div className="bg-[#0d0d0e] border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <h3 className="text-[11px] text-[#5a5a5a] uppercase tracking-widest">System Events</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed text-[#5a5a5a]">
        {logs.length === 0 ? (
          <div className="text-[#5a5a5a]">Waiting for events...</div>
        ) : (
          logs.map((log, i) => {
            const level = log.includes('⚠') ? 'text-yellow-500'
              : log.includes('✗') ? 'text-red-500'
              : 'text-green-500';
            return (
              <div key={i} className={level}>
                <span className="opacity-60">{log.substring(0, 10)}</span>
                <span>{log.substring(10)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
