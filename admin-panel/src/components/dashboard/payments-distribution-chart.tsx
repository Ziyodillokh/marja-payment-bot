'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  pending: number;
  approved: number;
  rejected: number;
  loading?: boolean;
}

export function PaymentsDistributionChart({
  pending,
  approved,
  rejected,
  loading,
}: Props) {
  const data = [
    { name: 'Kutilmoqda', value: pending, color: 'hsl(var(--warning))' },
    { name: 'Tasdiqlangan', value: approved, color: 'hsl(var(--success))' },
    { name: 'Rad etilgan', value: rejected, color: 'hsl(var(--destructive))' },
  ];
  const total = pending + approved + rejected;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>To&apos;lovlar holati</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div className="relative h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={84}
                    stroke="none"
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold tracking-tighter">
                  {total}
                </div>
                <div className="text-xs text-muted-foreground">Jami</div>
              </div>
            </div>

            <div className="space-y-3">
              {data.map((d) => {
                const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="text-sm text-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {d.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
