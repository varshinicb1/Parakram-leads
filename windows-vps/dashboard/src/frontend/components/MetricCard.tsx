import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  sparkline?: number[];
  icon?: React.ReactNode;
}

function pctColor(p: number) {
  if (p < 50) return 'var(--success)';
  if (p < 80) return 'var(--warning)';
  return 'var(--danger)';
}

function Skeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-3" />
      </div>
      <div className="skeleton h-7 w-20 mb-2" />
      <div className="skeleton h-3 w-28 mb-3" />
      <div className="skeleton h-1.5 w-full rounded-full mb-3" />
      <div className="skeleton h-10 w-full" />
    </div>
  );
}

export function MetricCard(props: MetricCardProps) {
  const { label, value, sub, pct = 0, sparkline, icon } = props;
  const color = pctColor(pct);
  const chartData = sparkline?.map((v, i) => ({ i, v })) ?? [];

  if (value === '—' && !sparkline?.length) return <Skeleton />;

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

export { MetricCard as MetricCardSkeleton };
