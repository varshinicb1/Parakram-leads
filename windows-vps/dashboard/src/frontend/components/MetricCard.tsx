import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  sparkline?: number[];
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

function pctColor(p: number) {
  if (p < 50) return 'var(--success)';
  if (p < 80) return 'var(--warning)';
  return 'var(--danger)';
}

export function MetricCard({ label, value, sub, pct = 0, sparkline, icon, trend }: MetricCardProps) {
  const color = pct !== undefined ? pctColor(pct) : 'var(--accent)';
  const chartData = sparkline?.map((v, i) => ({ i, v })) ?? [];

  return (
    <div className="group rounded-[16px] border border-border bg-surface p-5 transition-all duration-200 hover:shadow-sm hover:-translate-y-[1px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.1em]">{label}</span>
        {icon && (
          <span className="text-text-muted group-hover:text-text-secondary transition-colors">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-2xl font-semibold text-text-primary tabular-nums tracking-tight">
          {value}
        </span>
        {trend === 'up' && (
          <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
        )}
        {trend === 'down' && (
          <TrendingDown className="h-3.5 w-3.5 text-danger" strokeWidth={2.5} />
        )}
      </div>

      {sub && (
        <span className="text-xs text-text-muted">{sub}</span>
      )}

      {pct !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="mt-3 h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${label})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
