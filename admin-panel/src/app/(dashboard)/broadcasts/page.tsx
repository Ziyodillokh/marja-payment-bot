'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Bell, Plus } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { BroadcastStatusBadge } from '@/components/shared/status-badge';
import { useBroadcasts } from '@/lib/queries/useBroadcasts';
import type { Broadcast } from '@/types';

const FILTER_LABELS: Record<string, string> = {
  ALL: 'Hammaga',
  PAID: "To'lov qilganlar",
  UNPAID: "To'lov qilmaganlar",
  PENDING: 'Kutilmoqda',
  SPECIFIC: 'Tanlanganlarga',
};

export default function BroadcastsPage() {
  const { data, isLoading } = useBroadcasts();

  const columns: DataTableColumn<Broadcast>[] = [
    {
      key: 'id',
      header: 'ID',
      headerClassName: 'w-16',
      cell: (b) => <span className="font-mono text-xs text-muted-foreground">#{b.id}</span>,
    },
    {
      key: 'text',
      header: 'Matn',
      cell: (b) => (
        <div className="line-clamp-2 max-w-md text-sm">
          {b.text || <span className="text-muted-foreground italic">— faqat media —</span>}
        </div>
      ),
    },
    {
      key: 'filter',
      header: 'Auditoriya',
      cell: (b) => (
        <span className="text-xs text-muted-foreground">
          {FILTER_LABELS[b.filterType] ?? b.filterType}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Yuborilgan',
      cell: (b) => {
        const pct = b.totalCount > 0
          ? Math.round(((b.sentCount + b.failedCount) / b.totalCount) * 100)
          : 0;
        return (
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-mono text-foreground">
                {b.sentCount + b.failedCount}/{b.totalCount}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Holat',
      cell: (b) => <BroadcastStatusBadge status={b.status} />,
    },
    {
      key: 'date',
      header: 'Sana',
      cell: (b) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(b.createdAt), 'd MMM, HH:mm')}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Xabarlar"
        subtitle="Mass yuborishlar tarixi va monitoring"
        actions={
          <Button asChild>
            <Link href="/broadcasts/new">
              <Plus className="h-4 w-4" />
              Yangi broadcast
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey={(b) => b.id}
        onRowClick={(b) => {
          window.location.href = `/broadcasts/${b.id}`;
        }}
        emptyTitle="Hali broadcast yuborilmagan"
        emptyDescription="Yangi broadcast tugmasini bosing"
      />
    </>
  );
}
