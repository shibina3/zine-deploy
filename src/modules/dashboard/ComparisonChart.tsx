import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComparisonPoint } from './analytics';
import { formatCompactINR, formatINR } from '@/utils/money';
import { Card } from '@/components/common/Card';
import { cn } from '@/utils/cn';

function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-200/80 bg-porcelain px-3 py-2 shadow-lift">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-[12px] text-ink-700">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-ink-500">{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{formatINR(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function ComparisonChart({
  points,
  currentLabel,
  previousLabel,
  change,
}: {
  points: ComparisonPoint[];
  currentLabel: string;
  previousLabel: string;
  change: number | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-[17px] font-medium text-ink-900">Period comparison</h3>
            <p className="mt-0.5 text-[12px] text-ink-500">
              {currentLabel} vs {previousLabel}
            </p>
          </div>
          {typeof change === 'number' && (
            <span
              className={cn(
                'rounded-full px-2 py-1 text-[11px] font-semibold',
                change >= 0 ? 'bg-sage-50 text-sage-700' : 'bg-rose-50 text-rose-600',
              )}
            >
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10.5px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-wine-500" /> Sales · current
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-300" /> Sales · previous
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold-400" /> Collected · current
          </span>
        </div>
      </div>
      <div className="h-[245px] px-2 pb-3 pt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2d8cd" strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10.5, fill: '#9c8b80' }}
              interval={points.length > 16 ? 'preserveStartEnd' : 0}
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 10.5, fill: '#9c8b80' }}
              tickFormatter={(value: number) => formatCompactINR(value)}
            />
            <Tooltip content={<ComparisonTooltip />} cursor={{ fill: 'rgba(198,149,46,0.07)' }} />
            <Bar dataKey="previousSales" name="Previous sales" fill="#c4b5a8" radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Bar dataKey="currentSales" name="Sales" fill="#b23a57" radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Line
              type="monotone"
              dataKey="currentCollections"
              name="Collected"
              stroke="#d6ac48"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
