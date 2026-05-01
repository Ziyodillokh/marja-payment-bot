'use client';

import { CheckCircle2, CreditCard, DollarSign, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { UsersTrendChart } from '@/components/dashboard/users-trend-chart';
import { PaymentsDistributionChart } from '@/components/dashboard/payments-distribution-chart';
import { TopUtmSources } from '@/components/dashboard/top-utm-sources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/shared/status-badge';
import { useDashboardStats } from '@/lib/queries/useDashboard';
import { usePayments } from '@/lib/queries/usePayments';
import { formatPrice, getFullName } from '@/lib/utils';

// Deterministik psevdo-random sparkline (SSR/client mismatch'dan saqlanadi).
function spark(seed: number): number[] {
  return Array.from({ length: 12 }).map(
    (_, i) => Math.abs(Math.sin((i + seed) * 1.7)) * 80 + 20,
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: recentPayments, isLoading: paymentsLoading } = usePayments({
    page: 1,
    limit: 8,
  });

  const usersStats = stats?.users;
  const paymentsStats = stats?.payments;

  return (
    <>
      <PageHeader
        title="Bosh sahifa"
        subtitle="Loyihaning umumiy holati va so'nggi aksiyalar"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Foydalanuvchilar"
          value={usersStats?.total ?? '—'}
          icon={Users}
          delta={12.4}
          spark={spark(1)}
          loading={isLoading}
        />
        <StatCard
          label="To'lovlar"
          value={paymentsStats?.total ?? '—'}
          icon={CreditCard}
          delta={4.8}
          spark={spark(2)}
          loading={isLoading}
        />
        <StatCard
          label="Tasdiqlangan"
          value={paymentsStats?.approved ?? '—'}
          icon={CheckCircle2}
          delta={8.1}
          spark={spark(3)}
          loading={isLoading}
        />
        <StatCard
          label="Daromad"
          value={
            paymentsStats
              ? formatPrice(paymentsStats.approvedAmount)
              : '—'
          }
          icon={DollarSign}
          delta={-2.3}
          spark={spark(4)}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UsersTrendChart />
        <PaymentsDistributionChart
          pending={paymentsStats?.pending ?? 0}
          approved={paymentsStats?.approved ?? 0}
          rejected={paymentsStats?.rejected ?? 0}
          loading={isLoading}
        />
      </div>

      {/* Top UTM sources */}
      <div className="mt-6">
        <TopUtmSources data={stats?.topUtmSources} loading={isLoading} />
      </div>

      {/* Recent payments */}
      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>So&apos;nggi to&apos;lovlar</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/payments">Hammasini ko&apos;rish</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y divide-border">
              {paymentsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : !recentPayments || recentPayments.items.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Hali to&apos;lov yo&apos;q
                </div>
              ) : (
                recentPayments.items.map((p) => (
                  <Link
                    href={`/payments/${p.id}`}
                    key={p.id}
                    className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-subtle/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="font-mono text-xs text-muted-foreground">
                        #{p.id}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {getFullName(p.user?.firstName, p.user?.lastName)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.user?.username
                            ? `@${p.user.username} · `
                            : ''}
                          {formatDistanceToNow(new Date(p.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-foreground">
                        {formatPrice(p.amount)}
                      </span>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
