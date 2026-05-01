'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Award,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gift,
  Hash,
  Phone,
  Play,
  Settings2,
  Trophy,
  Users as UsersIcon,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserOverview } from '@/types';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { UtmBadge } from '@/components/shared/utm-badge';
import { ReceiptImage } from '@/components/shared/receipt-image';
import { EmptyState } from '@/components/shared/empty-state';
import { PointsHistoryRow } from '@/components/users/points-history-row';
import { AdjustPointsDialog } from '@/components/users/adjust-points-dialog';
import { useUserOverview } from '@/lib/queries/useUsers';
import {
  cn,
  formatPrice,
  getFullName,
  getInitials,
} from '@/lib/utils';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading } = useUserOverview(id);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const user = data?.user;
  const fullName = getFullName(user?.firstName, user?.lastName);
  const displayName = fullName || (user?.username ? '@' + user.username : `User #${id}`);

  return (
    <>
      <PageHeader
        title={isLoading ? '...' : displayName}
        breadcrumbs={[
          { label: 'Foydalanuvchilar', href: '/users' },
          { label: `#${id}` },
        ]}
        actions={
          user && (
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Ball o&apos;zgartirish
            </Button>
          )
        }
      />

      {/* TOP: profil + 3 ta stats card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
        {/* Profile card */}
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            {isLoading ? (
              <Skeleton className="h-14 w-14 rounded-full" />
            ) : (
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-tighter">
                      {displayName}
                    </h2>
                    {user && <UserStatusBadge status={user.status} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {user?.username && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <a
                          href={`https://t.me/${user.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground"
                        >
                          @{user.username}
                        </a>
                      </span>
                    )}
                    {user?.phoneNumber && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3" />
                        {user.phoneNumber}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="h-3 w-3" />
                      {user?.telegramId ?? '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats: ball, reyting, referrallar */}
        <MiniStat
          icon={Wallet}
          label="Ball"
          value={isLoading ? '—' : formatPrice(user?.points ?? 0)}
        />
        <MiniStat
          icon={Trophy}
          label="Reyting"
          value={isLoading ? '—' : user?.rank && user.rank > 0 ? `#${user.rank}` : '—'}
        />
        <MiniStat
          icon={UsersIcon}
          label="Referrallar"
          value={isLoading ? '—' : String(data?.referralStats.totalReferrals ?? 0)}
        />
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Umumiy</TabsTrigger>
          <TabsTrigger value="payments">
            To&apos;lovlar
            {data && data.payments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {data.payments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="points">
            Ball tarixi
            {data && data.pointsHistory.total > 0 && (
              <span className="ml-1.5 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {data.pointsHistory.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="referrals">
            Referrallar
            {data && data.referralStats.totalReferrals > 0 && (
              <span className="ml-1.5 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {data.referralStats.totalReferrals}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ───────── UMUMIY ───────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Voqealar tarixi</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline user={user} loading={isLoading} />
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Profil ma&apos;lumotlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Til">
                  <span className="text-xs uppercase">
                    {user?.languageCode ?? '—'}
                  </span>
                </Field>
                <Field label="Telegram ID">
                  <span className="font-mono text-xs">
                    {user?.telegramId ?? '—'}
                  </span>
                </Field>
                <Field label="Telefon">
                  <span className="font-mono text-xs">
                    {user?.phoneNumber ?? '—'}
                  </span>
                </Field>
                <Field label="Ro'yxatdan o'tgan">
                  <span className="text-xs">
                    {user
                      ? format(new Date(user.createdAt), 'd MMM yyyy, HH:mm')
                      : '—'}
                  </span>
                </Field>
                {user?.referredById && (
                  <Field label="Kim tomonidan jalb qilingan">
                    <Link
                      href={`/users/${user.referredById}`}
                      className="text-xs text-primary hover:underline"
                    >
                      User #{user.referredById}
                    </Link>
                  </Field>
                )}
                <Field label="Manba">
                  {user?.utmSource ? (
                    <UtmBadge
                      code={user.utmSource.code}
                      name={user.utmSource.name}
                    />
                  ) : (
                    <UtmBadge
                      code="direct"
                      name="To'g'ridan-to'g'ri (linksiz)"
                    />
                  )}
                </Field>
                {user?.utmRawParam && (
                  <Field label="Start parameter">
                    <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px]">
                      {user.utmRawParam}
                    </code>
                  </Field>
                )}
                <Field label="Jami daromad keltirgan">
                  <span className="font-mono text-xs text-success">
                    +{data?.referralStats.totalEarnedPoints ?? 0} ball
                  </span>
                </Field>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ───────── TO'LOVLAR ───────── */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !data || data.payments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Hali to'lov yo'q"
                  description="Bu foydalanuvchi hech qachon chek yubormagan."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.payments.map((p) => (
                    <Link
                      key={p.id}
                      href={`/payments/${p.id}`}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-subtle/40"
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <ReceiptImage paymentId={p.id} thumbnail />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{p.id}
                          </span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(p.createdAt), 'd MMM yyyy, HH:mm')}
                          {' · '}
                          {formatDistanceToNow(new Date(p.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold">
                          {formatPrice(p.amount)}
                        </div>
                        {p.rejectionReason && (
                          <div className="mt-0.5 line-clamp-1 max-w-[180px] text-xs text-destructive">
                            {p.rejectionReason}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── BALL TARIXI ───────── */}
        <TabsContent value="points">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !data || data.pointsHistory.items.length === 0 ? (
                <EmptyState
                  icon={Gift}
                  title="Hali ball harakati yo'q"
                  description="Foydalanuvchi referral jalb qilsa yoki diskussiya guruhida faollik ko'rsatsa, ballar shu yerga tushadi."
                />
              ) : (
                <div className="divide-y divide-border px-4">
                  {data.pointsHistory.items.map((tx) => (
                    <PointsHistoryRow key={tx.id} tx={tx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── REFERRALLAR ───────── */}
        <TabsContent value="referrals">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ReferralStat
              icon={UsersIcon}
              label="Jami jalb qilganlar"
              value={data?.referralStats.totalReferrals ?? 0}
            />
            <ReferralStat
              icon={CheckCircle2}
              label="Kurs sotib olganlar"
              value={data?.referralStats.purchasedReferrals ?? 0}
              accent="success"
            />
            <ReferralStat
              icon={Award}
              label="Topilgan ball"
              value={data?.referralStats.totalEarnedPoints ?? 0}
            />
          </div>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle>Jalb qilingan foydalanuvchilar</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {/* TODO: backend'da listReferralsOf endpoint mavjud, lekin overview da olmaymiz.
                   Hozircha referralStats va ball tarixi orqali ko'rsatamiz. */}
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Batafsil ro&apos;yxat uchun{' '}
                <Link
                  href={`/users/${id}/referrals`}
                  className="text-primary hover:underline"
                >
                  alohida sahifa
                </Link>{' '}
                ochiladi (keyingi versiyada).
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {user && (
        <AdjustPointsDialog
          userId={id}
          userName={displayName}
          currentBalance={user.points}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
        />
      )}
    </>
  );
}

// ──────────── HELPERS ────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-subtle text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="font-mono text-lg font-semibold tracking-tighter">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReferralStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: 'success';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div
          className={cn(
            'mt-2 font-mono text-2xl font-semibold tracking-tighter',
            accent === 'success' && 'text-success',
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineItem {
  label: string;
  date: string | null;
  done: boolean;
  icon: LucideIcon;
}

function Timeline({
  user,
  loading,
}: {
  user: UserOverview['user'] | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (!user) return null;

  const items: TimelineItem[] = [
    {
      label: '/start bosildi',
      date: user.startedAt,
      done: true,
      icon: Play,
    },
    {
      label: 'Telefon raqami berildi',
      date: user.phoneNumber ? user.updatedAt : null,
      done: !!user.phoneNumber,
      icon: Phone,
    },
    {
      label: "To'lov boshlandi",
      date: user.paymentStartedAt,
      done: !!user.paymentStartedAt,
      icon: CreditCard,
    },
    {
      label: 'Tasdiqlandi',
      date: user.approvedAt,
      done: !!user.approvedAt,
      icon: CheckCircle2,
    },
  ];

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              'absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-card',
              item.done
                ? 'bg-success text-success-foreground'
                : 'bg-subtle text-muted-foreground',
            )}
          >
            <item.icon className="h-2.5 w-2.5" />
          </span>
          <div className="space-y-0.5">
            <div
              className={cn(
                'text-sm font-medium',
                item.done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {item.label}
            </div>
            <div className="text-xs text-muted-foreground">
              {item.date
                ? format(new Date(item.date), 'd MMM yyyy, HH:mm')
                : "Hali yo'q"}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

