'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { PaymentStatusBadge } from '@/components/shared/status-badge';
import { PaymentActionDialog } from '@/components/payments/payment-action-dialog';
import { ReceiptImage } from '@/components/shared/receipt-image';
import {
  useApprovePayment,
  usePayments,
  useRejectPayment,
} from '@/lib/queries/usePayments';
import { formatPrice, getFullName, getInitials } from '@/lib/utils';
import type { Payment, PaymentStatus } from '@/types';

type TabKey = 'ALL' | PaymentStatus;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'ALL', label: 'Hammasi' },
  { key: 'PENDING', label: 'Kutilmoqda' },
  { key: 'APPROVED', label: 'Tasdiqlangan' },
  { key: 'REJECTED', label: 'Rad etilgan' },
];

export default function PaymentsPage() {
  const [tab, setTab] = useState<TabKey>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePayments({
    status: tab === 'ALL' ? undefined : tab,
    page,
    limit: 20,
  });

  const [selected, setSelected] = useState<Payment | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();

  const closeDialog = () => {
    setSelected(null);
    setAction(null);
  };

  const handleConfirm = (reason?: string) => {
    if (!selected || !action) return;
    if (action === 'approve') {
      approveMutation.mutate(selected.id, { onSuccess: closeDialog });
    } else {
      rejectMutation.mutate(
        { id: selected.id, reason },
        { onSuccess: closeDialog },
      );
    }
  };

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'id',
      header: '№',
      headerClassName: 'w-16',
      cell: (p) => (
        <span className="font-mono text-xs text-muted-foreground">#{p.id}</span>
      ),
    },
    {
      key: 'receipt',
      header: 'Chek',
      headerClassName: 'w-16',
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ReceiptImage paymentId={p.id} thumbnail />
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Foydalanuvchi',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px]">
              {getInitials(p.user?.firstName, p.user?.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {getFullName(p.user?.firstName, p.user?.lastName)}
            </div>
            {p.user?.username && (
              <div className="truncate text-xs text-muted-foreground">
                @{p.user.username}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      cell: (p) => (
        <span className="font-mono text-xs">{p.user?.phoneNumber ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Summa',
      cell: (p) => (
        <span className="font-mono text-sm font-medium">
          {formatPrice(p.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      cell: (p) => <PaymentStatusBadge status={p.status} />,
    },
    {
      key: 'date',
      header: 'Sana',
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(p.createdAt), 'd MMM, HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/payments/${p.id}`}>Ko&apos;rish</Link>
          </Button>
          {p.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                  setAction('approve');
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                  setAction('reject');
                }}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="To'lovlar"
        subtitle="Foydalanuvchilarning to'lov cheklari"
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as TabKey);
          setPage(1);
        }}
        className="mb-4"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        rowKey={(p) => p.id}
        emptyTitle="To'lov topilmadi"
        emptyDescription={
          tab === 'PENDING'
            ? "Hozircha tasdiqlash kutayotgan to'lov yo'q"
            : "Bu kategoriyada to'lov yo'q"
        }
        pagination={
          data
            ? {
                page: data.page,
                limit: data.limit,
                total: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      <PaymentActionDialog
        payment={selected}
        action={action}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        loading={approveMutation.isPending || rejectMutation.isPending}
      />
    </>
  );
}
