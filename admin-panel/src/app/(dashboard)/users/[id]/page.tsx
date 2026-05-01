'use client';

import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  CheckCircle2,
  CircleDot,
  CreditCard,
  Phone,
  Play,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserStatusBadge } from '@/components/shared/status-badge';
import { useUser } from '@/lib/queries/useUsers';
import { getFullName, getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TimelineItem {
  label: string;
  date: string | null;
  done: boolean;
  icon: typeof Play;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: user, isLoading } = useUser(id);

  const timeline: TimelineItem[] = user
    ? [
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
      ]
    : [];

  return (
    <>
      <PageHeader
        title={isLoading ? '...' : getFullName(user?.firstName, user?.lastName)}
        breadcrumbs={[
          { label: 'Foydalanuvchilar', href: '/users' },
          { label: `#${id}` },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-base">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-1 h-4 w-20" />
                  </>
                ) : (
                  <>
                    <div className="text-base font-semibold tracking-tighter">
                      {getFullName(user?.firstName, user?.lastName)}
                    </div>
                    {user?.username && (
                      <div className="text-sm text-muted-foreground">
                        @{user.username}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <Field label="Status">
                {user ? <UserStatusBadge status={user.status} /> : <Skeleton className="h-5 w-20" />}
              </Field>
              <Field label="Telegram ID">
                <span className="font-mono text-xs">{user?.telegramId ?? '—'}</span>
              </Field>
              <Field label="Telefon">
                <span className="font-mono text-xs">{user?.phoneNumber ?? '—'}</span>
              </Field>
              <Field label="Til">
                <span className="text-xs uppercase">
                  {user?.languageCode ?? '—'}
                </span>
              </Field>
              <Field label="Ro'yxatdan o'tgan">
                <span className="text-xs">
                  {user
                    ? format(new Date(user.createdAt), 'd MMM yyyy, HH:mm')
                    : '—'}
                </span>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Voqealar tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ol className="relative space-y-6 border-l border-border pl-6">
                {timeline.map((item, i) => (
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
                          item.done
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.date
                          ? format(new Date(item.date), "d MMM yyyy, HH:mm")
                          : 'Hali yo\'q'}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
