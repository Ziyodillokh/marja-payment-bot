'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { CheckCircle2, Link2, TrendingUp, Trophy, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/stat-card';
import { FunnelComparisonTable } from '@/components/utm/funnel-comparison-table';
import { FunnelBarChart } from '@/components/utm/funnel-bar-chart';
import { DailyLineChart } from '@/components/utm/daily-line-chart';
import { useUtmDaily, useUtmFunnel, useUtmSources } from '@/lib/queries/useUtm';
import { compactNumber } from '@/lib/utm-helpers';

type SourceFilter = 'all' | 'direct' | string;

function UtmAnalyticsContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('source') ?? 'all';
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initial);

  // Default sana oralig'i: oxirgi 30 kun
  const [days] = useState(30);
  const dateRange = useMemo(() => {
    const to = new Date();
    const from = subDays(to, days);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      fromShort: format(from, 'd MMM'),
      toShort: format(to, 'd MMM yyyy'),
    };
  }, [days]);

  const utmSourceIdParam =
    sourceFilter === 'all'
      ? undefined
      : sourceFilter === 'direct'
        ? null
        : sourceFilter;

  const { data: sources } = useUtmSources();
  const { data: funnel, isLoading: funnelLoading } = useUtmFunnel({
    from: dateRange.from,
    to: dateRange.to,
    utmSourceId: utmSourceIdParam,
  });
  const { data: daily, isLoading: dailyLoading } = useUtmDaily({
    from: dateRange.from,
    to: dateRange.to,
    utmSourceId: utmSourceIdParam,
  });

  // ──── 4 ta StatCard uchun aggregate ────
  const aggregate = useMemo(() => {
    if (!funnel) {
      return {
        totalUsers: 0,
        activeSources: 0,
        avgConversion: 0,
        bestSource: null as null | { code: string; name: string; rate: number },
      };
    }
    const totalUsers = funnel.reduce((sum, m) => sum + m.totalUsers, 0);
    const totalApproved = funnel.reduce((s, m) => s + m.paymentApproved, 0);
    const avgConv =
      totalUsers > 0 ? Math.round((totalApproved / totalUsers) * 1000) / 10 : 0;

    const eligible = funnel.filter((m) => m.totalUsers >= 5); // min sample
    const best = eligible.reduce<null | (typeof funnel)[number]>(
      (best, m) => (!best || m.approvalRate > best.approvalRate ? m : best),
      null,
    );
    const activeSources = (sources ?? []).filter((s) => s.isActive).length;

    return {
      totalUsers,
      activeSources,
      totalSources: sources?.length ?? 0,
      avgConversion: avgConv,
      bestSource: best
        ? { code: best.code, name: best.name, rate: best.approvalRate }
        : null,
    };
  }, [funnel, sources]);

  return (
    <>
      <PageHeader
        title="UTM statistika"
        subtitle={`${dateRange.fromShort} — ${dateRange.toShort} (oxirgi ${days} kun)`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as SourceFilter)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Manba" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha manbalar</SelectItem>
                <SelectItem value="direct">To&apos;g&apos;ridan-to&apos;g&apos;ri</SelectItem>
                {sources?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* ──── A) STATCARDLAR ──── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Jami kelganlar"
          value={compactNumber(aggregate.totalUsers)}
          icon={Users}
          loading={funnelLoading}
        />
        <StatCard
          label="Faol manbalar"
          value={
            aggregate.totalSources
              ? `${aggregate.activeSources} / ${aggregate.totalSources}`
              : '—'
          }
          icon={Link2}
          loading={funnelLoading}
        />
        <StatCard
          label="O'rtacha konversiya"
          value={`${aggregate.avgConversion}%`}
          icon={CheckCircle2}
          loading={funnelLoading}
        />
        <StatCard
          label="Eng yaxshi manba"
          value={
            aggregate.bestSource
              ? `${aggregate.bestSource.code}`
              : '—'
          }
          icon={Trophy}
          loading={funnelLoading}
        />
      </div>

      {/* ──── B) TAQQOSLASH JADVALI ──── */}
      <div className="mt-6">
        <FunnelComparisonTable data={funnel} loading={funnelLoading} />
      </div>

      {/* ──── C) FUNNEL BAR CHART ──── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle>Manbalar funneli</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : !funnel || funnel.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                Ma&apos;lumot yo&apos;q
              </div>
            ) : (
              <FunnelBarChart data={funnel} />
            )}
          </CardContent>
        </Card>

        {/* ──── D) KUNMA-KUN TIMELINE ──── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Vaqt bo&apos;yicha dynamics</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : !daily || daily.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-center text-sm text-muted-foreground">
                <div>
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 opacity-30" />
                  Ushbu davrda ma&apos;lumot yo&apos;q
                </div>
              </div>
            ) : (
              <DailyLineChart data={daily} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function UtmAnalyticsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-32 w-full" />}>
      <UtmAnalyticsContent />
    </Suspense>
  );
}
