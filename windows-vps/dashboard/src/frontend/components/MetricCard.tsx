interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  sparkline?: number[];
}

function barColor(p: number) {
  if (p < 50) return 'linear-gradient(90deg,#22c55e,#16a34a)';
  if (p < 80) return 'linear-gradient(90deg,#eab308,#ca8a04)';
  return 'linear-gradient(90deg,#ef4444,#dc2626)';
}

export function MetricCard({ label, value, sub, pct = 0, sparkline }: MetricCardProps) {
  return (
    <div className="bg-[#0d0d0e] border border-[rgba(255,255,255,0.06)] rounded-lg p-3.5 hover:border-[rgba(201,169,110,0.2)] transition-colors">
      <div className="text-[10px] text-[#5a5a5a] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[22px] font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[#5a5a5a] mt-0.5">{sub}</div>}
      {pct !== undefined && (
        <div className="h-1 bg-[#1a1a1c] rounded mt-1.5 overflow-hidden">
          <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: barColor(pct) }} />
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div className="flex items-end gap-px h-6 mt-1.5">
          {sparkline.map((v, i) => (
            <div key={i} className="bg-[#c9a96e] opacity-40 rounded-sm flex-1 min-w-[2px] last:opacity-100"
              style={{ height: `${Math.max(2, v / Math.max(...sparkline, 1) * 100)}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}
