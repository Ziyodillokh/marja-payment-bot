'use client';

import { CheckCircle2, CreditCard, DollarSign, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { UsersTrendChart } from '@/components/dashboard/users-trend-chart';
import { PaymentsDistributionChart } from '@/components/dashboard/payments-distribution-chart';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { useDashboardStats } from '@/lib/queries/useDashboard';
import { useDateRangeParams } from '@/lib/queries/useDateRange';
import { rangeToApiParams } from '@/lib/date-range';
import { formatPrice } from '@/lib/utils';

function spark(seed: number): number[] {
  return Array.from({ length: 12 }).map(
    (_, i) => Math.abs(Math.sin((i + seed) * 1.7)) * 80 + 20,
  );
}

export default function StatisticsPage() {
  const { range, setRange } = useDateRangeParams();
  const { data, isLoading } = useDashboardStats(rangeToApiParams(range));

  return (
    <>
      <PageHeader
        title="Statistika"
        subtitle="Loyiha bo'yicha batafsil ko'rsatkichlar"
        actions={<DateRangePicker value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Foydalanuvchilar"
          value={data?.users.total ?? '—'}
          icon={Users}
          spark={spark(1)}
          loading={isLoading}
        />
        <StatCard
          label="To'lovlar"
          value={data?.payments.total ?? '—'}
          icon={CreditCard}
          spark={spark(2)}
          loading={isLoading}
        />
        <StatCard
          label="Tasdiqlangan"
          value={data?.payments.approved ?? '—'}
          icon={CheckCircle2}
          spark={spark(3)}
          loading={isLoading}
        />
        <StatCard
          label="Daromad"
          value={data ? formatPrice(data.payments.approvedAmount) : '—'}
          icon={DollarSign}
          spark={spark(4)}
          loading={isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UsersTrendChart />
        <PaymentsDistributionChart
          pending={data?.payments.pending ?? 0}
          approved={data?.payments.approved ?? 0}
          rejected={data?.payments.rejected ?? 0}
          loading={isLoading}
        />
      </div>
    </>
  );
}
