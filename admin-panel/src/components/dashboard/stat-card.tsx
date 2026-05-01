import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number; // % o'zgarish
  icon?: LucideIcon;
  spark?: number[];
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  spark,
  loading,
}: StatCardProps) {
  const sparkData = spark?.map((y, i) => ({ i, y })) ?? [];
  const positive = (delta ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold tracking-tighter text-foreground">
              {value}
            </div>
          )}
          {delta !== undefined && !loading && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                positive ? 'text-success' : 'text-destructive',
              )}
            >
              {positive ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
              <span className="text-muted-foreground"> oldingi davrga</span>
            </div>
          )}
        </div>
      </div>

      {sparkData.length > 0 && !loading && (
        <div className="absolute bottom-0 right-0 h-12 w-32 opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--foreground))"
                strokeWidth={1.5}
                fill="url(#spark)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
