'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Users as UsersIcon } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { UserStatusBadge } from '@/components/shared/status-badge';
import { useUsers } from '@/lib/queries/useUsers';
import { getFullName, getInitials } from '@/lib/utils';
import type { User, UserStatus } from '@/types';

const STATUS_OPTIONS: Array<{ value: 'ALL' | UserStatus; label: string }> = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'NEW', label: 'Yangi' },
  { value: 'PHONE_PROVIDED', label: 'Telefon berilgan' },
  { value: 'PAYMENT_PENDING', label: 'Kutilmoqda' },
  { value: 'APPROVED', label: 'Tasdiqlangan' },
  { value: 'REJECTED', label: 'Rad etilgan' },
  { value: 'BLOCKED', label: 'Bloklangan' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | UserStatus>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUsers({
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });

  const columns: DataTableColumn<User>[] = [
    {
      key: 'id',
      header: 'ID',
      headerClassName: 'w-16',
      cell: (u) => (
        <span className="font-mono text-xs text-muted-foreground">#{u.id}</span>
      ),
    },
    {
      key: 'user',
      header: 'Foydalanuvchi',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px]">
              {getInitials(u.firstName, u.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {getFullName(u.firstName, u.lastName)}
            </div>
            {u.username && (
              <div className="truncate text-xs text-muted-foreground">
                @{u.username}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Telefon',
      cell: (u) => (
        <span className="font-mono text-xs text-foreground">
          {u.phoneNumber ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => <UserStatusBadge status={u.status} />,
    },
    {
      key: 'createdAt',
      header: "Ro'yxatdan o'tgan",
      cell: (u) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(u.createdAt), 'd MMM yyyy, HH:mm')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-20 text-right',
      className: 'text-right',
      cell: (u) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/users/${u.id}`}>Ko&apos;rish</Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Foydalanuvchilar"
        subtitle={
          data
            ? `Jami ${data.total} ta foydalanuvchi`
            : "Botning barcha foydalanuvchilari"
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ism, username yoki telefon..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v as 'ALL' | UserStatus);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items}
        isLoading={isLoading}
        rowKey={(u) => u.id}
        emptyTitle="Foydalanuvchi topilmadi"
        emptyDescription={
          search || status !== 'ALL'
            ? 'Filtrni o\'zgartirib qayta urining'
            : "Bot hali bironta foydalanuvchi qabul qilmagan"
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
    </>
  );
}
