'use client';

// Kunma-kun line chart. Tabs: kelganlar / tasdiqlanganlar.

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { utmHexFromCode } from '@/lib/utm-helpers';
import type { UtmDailyMetric } from '@/types';

interface Props {
  data: UtmDailyMetric[];
}

type Metric = 'users' | 'approved';

export function DailyLineChart({ data }: Props) {
  const [metric, setMetric] = useState<Metric>('users');

  // Pivot: { day, [source_code]: number }
  const { rows, sources } = useMemo(() => {
    const sourcesSet = new Set<string>();
    const grouped = new Map<string, Record<string, number | string>>();

    for (const d of data) {
      const day = d.day;
      const code = d.source_code ?? 'all';
      sourcesSet.add(code);
      if (!grouped.has(day)) grouped.set(day, { day });
      grouped.get(day)![code] = d[metric];
    }

    return {
      rows: Array.from(grouped.values()).sort((a, b) =>
        String(a.day).localeCompare(String(b.day)),
      ),
      sources: Array.from(sourcesSet),
    };
  }, [data, metric]);

  return (
    <div className="space-y-3">
      <Tabs
        value={metric}
        onValueChange={(v) => setMetric(v as Metric)}
        className="inline-block"
      >
        <TabsList>
          <TabsTrigger value="users">Kelganlar</TabsTrigger>
          <TabsTrigger value="approved">Tasdiqlanganlar</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => {
                try {
                  return format(parseISO(d), 'd MMM');
                } catch {
                  return d;
                }
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(d) => {
                try {
                  return format(parseISO(d as string), 'd MMM yyyy');
                } catch {
                  return d as string;
                }
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {sources.map((src) => (
              <Line
                key={src}
                type="monotone"
                dataKey={src}
                stroke={utmHexFromCode(src)}
                strokeWidth={1.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
