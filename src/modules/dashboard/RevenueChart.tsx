import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyPoint } from '@/modules/reports/logic';
import type { HourlyPoint } from './analytics';
import { formatCompactINR, formatINR } from '@/utils/money';
import { Card } from '@/components/common/Card';

function ChartTooltip({
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

export function RevenueChart({
  series,
  title = 'Sales & collections',
  subtitle,
}: {
  series: DailyPoint[] | HourlyPoint[];
  title?: string;
  subtitle: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="font-display text-[17px] font-medium text-ink-900">{title}</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-wine-500" /> Sales
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold-400" /> Collected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-300" /> Expenses
          </span>
        </div>
      </div>
      <div className="h-[260px] px-2 pb-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b23a57" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#b23a57" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="collectionsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d6ac48" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#d6ac48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2d8cd" strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#9c8b80' }}
              interval={series.length > 16 ? 'preserveStartEnd' : 0}
              minTickGap={22}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={54}
              tick={{ fontSize: 11, fill: '#9c8b80' }}
              tickFormatter={(value: number) => formatCompactINR(value)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#c4b5a8', strokeDasharray: '3 4' }} />
            <Area
              type="monotone"
              dataKey="sales"
              name="Sales"
              stroke="#b23a57"
              strokeWidth={2}
              fill="url(#salesFill)"
            />
            <Area
              type="monotone"
              dataKey="collections"
              name="Collected"
              stroke="#d6ac48"
              strokeWidth={2}
              fill="url(#collectionsFill)"
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#9c8b80"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
