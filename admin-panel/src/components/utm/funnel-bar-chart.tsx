'use client';

// Bar chart: har source uchun funnel (kelganlar → telefon → to'lov → tasdiq).

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { utmHexFromCode } from '@/lib/utm-helpers';
import type { UtmFunnelMetrics } from '@/types';

const STAGES = [
  { key: 'totalUsers', label: 'Kelgan' },
  { key: 'phoneProvided', label: 'Telefon' },
  { key: 'paymentInitiated', label: 'To\'lov' },
  { key: 'paymentSubmitted', label: 'Chek' },
  { key: 'paymentApproved', label: 'Tasdiq.' },
] as const;

interface Props {
  data: UtmFunnelMetrics[];
}

export function FunnelBarChart({ data }: Props) {
  // Recharts uchun: har row — bosqich, har source — alohida ustun
  const chartData = STAGES.map((stage) => {
    const row: Record<string, string | number> = { stage: stage.label };
    data.forEach((m) => {
      row[m.code] = m[stage.key as keyof UtmFunnelMetrics] as number;
    });
    return row;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--subtle))' }}
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {data.map((m) => (
            <Bar
              key={m.code}
              dataKey={m.code}
              fill={utmHexFromCode(m.code)}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
