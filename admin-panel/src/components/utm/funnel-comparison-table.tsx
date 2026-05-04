'use client';

// Manbalar funnel taqqoslash jadvali. Sortable.
// Eng yuqori konversiyali source 🏆 belgisi bilan.

import { useMemo, useState } from 'react';
import { ArrowUpDown, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UtmBadge } from '@/components/shared/utm-badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  compactNumber,
  conversionColor,
} from '@/lib/utm-helpers';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { UtmFunnelMetrics } from '@/types';

type SortKey =
  | 'totalUsers'
  | 'phoneProvided'
  | 'paymentInitiated'
  | 'paymentApproved'
  | 'approvalRate'
  | 'revenue';

interface Props {
  data: UtmFunnelMetrics[] | undefined;
  loading?: boolean;
}

export function FunnelComparisonTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalUsers');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    arr.sort((a, b) => {
      const av =
        sortKey === 'revenue'
          ? Number(a.revenue)
          : (a[sortKey] as number);
      const bv =
        sortKey === 'revenue'
          ? Number(b.revenue)
          : (b[sortKey] as number);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const bestApprovalRate = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.filter((d) => d.totalUsers > 0).map((d) => d.approvalRate), 0);
  }, [data]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Manbalar bo&apos;yicha taqqoslash</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            title="Hali ma'lumot yo'q"
            description="UTM source'lar yarating va reklama qiling"
          />
        ) : (
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-subtle/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <Th>Manba</Th>
                  <ThSort
                    label="Kelgan"
                    active={sortKey === 'totalUsers'}
                    dir={sortDir}
                    onClick={() => toggle('totalUsers')}
                  />
                  <ThSort
                    label="Telefon"
                    active={sortKey === 'phoneProvided'}
                    dir={sortDir}
                    onClick={() => toggle('phoneProvided')}
                  />
                  <ThSort
                    label="To'lov tugmasi"
                    title="Foydalanuvchi 'To'lov qilish' tugmasini bosgan (chek yuborilgan emas)"
                    active={sortKey === 'paymentInitiated'}
                    dir={sortDir}
                    onClick={() => toggle('paymentInitiated')}
                  />
                  <ThSort
                    label="Tasdiq."
                    active={sortKey === 'paymentApproved'}
                    dir={sortDir}
                    onClick={() => toggle('paymentApproved')}
                  />
                  <ThSort
                    label="Konv. %"
                    active={sortKey === 'approvalRate'}
                    dir={sortDir}
                    onClick={() => toggle('approvalRate')}
                  />
                  <ThSort
                    label="Daromad"
                    active={sortKey === 'revenue'}
                    dir={sortDir}
                    onClick={() => toggle('revenue')}
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr
                    key={m.utmSourceId ?? 'direct'}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UtmBadge code={m.code} name={m.name} />
                        <span className="text-xs text-muted-foreground">
                          {m.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {compactNumber(m.totalUsers)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {compactNumber(m.phoneProvided)}
                      <PercentHint
                        value={m.phoneRate}
                        show={m.totalUsers > 0}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {compactNumber(m.paymentInitiated)}
                      <PercentHint
                        value={m.paymentInitRate}
                        show={m.totalUsers > 0}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {compactNumber(m.paymentApproved)}
                      <PercentHint
                        value={m.approvalRate}
                        show={m.totalUsers > 0}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'font-mono font-semibold',
                            conversionColor(m.approvalRate),
                          )}
                        >
                          {m.totalUsers > 0 ? `${m.approvalRate}%` : '—'}
                        </span>
                        {m.totalUsers > 0 &&
                          m.approvalRate === bestApprovalRate &&
                          bestApprovalRate > 0 && (
                            <Trophy className="h-3 w-3 text-amber-500" />
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {Number(m.revenue) > 0
                        ? formatPrice(m.revenue, '')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-medium">{children}</th>;
}

function ThSort({
  label,
  active,
  dir,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  title?: string;
}) {
  return (
    <th className="px-4 py-3 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <ArrowUpDown
          className={cn(
            'h-3 w-3',
            active ? 'opacity-100' : 'opacity-30',
            active && dir === 'asc' && 'rotate-180',
          )}
        />
      </button>
    </th>
  );
}

function PercentHint({ value, show }: { value: number; show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1 text-[10px] text-muted-foreground">({value}%)</span>
  );
}
