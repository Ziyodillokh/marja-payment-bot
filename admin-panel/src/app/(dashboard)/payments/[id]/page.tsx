'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, Clock, FileText, Hash, User as UserIcon, X } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/shared/status-badge';
import { PaymentActionDialog } from '@/components/payments/payment-action-dialog';
import { ReceiptImage } from '@/components/shared/receipt-image';
import {
  useApprovePayment,
  usePayment,
  useRejectPayment,
} from '@/lib/queries/usePayments';
import { formatPrice, getFullName, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: payment, isLoading } = usePayment(id);

  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();

  const closeDialog = () => setAction(null);
  const handleConfirm = (reason?: string) => {
    if (!payment || !action) return;
    if (action === 'approve') {
      approveMutation.mutate(payment.id, { onSuccess: closeDialog });
    } else {
      rejectMutation.mutate(
        { id: payment.id, reason },
        { onSuccess: closeDialog },
      );
    }
  };

  return (
    <>
      <PageHeader
        title={`To'lov #${id}`}
        breadcrumbs={[
          { label: "To'lovlar", href: '/payments' },
          { label: `#${id}` },
        ]}
        actions={
          payment?.status === 'PENDING' && (
            <>
              <Button
                variant="outline"
                onClick={() => setAction('reject')}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Rad etish
              </Button>
              <Button onClick={() => setAction('approve')}>
                <Check className="h-4 w-4" />
                Tasdiqlash
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Receipt photo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Chek rasmi</CardTitle>
            {payment && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(payment.createdAt), {
                  addSuffix: true,
                })}{' '}
                yuborilgan
              </span>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="mx-auto aspect-[4/5] w-full max-w-md" />
            ) : payment ? (
              <div className="mx-auto max-w-md">
                <ReceiptImage paymentId={payment.id} />
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Rasmni kattalashtirish uchun bosing
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Ma&apos;lumot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Holat">
                {payment ? (
                  <PaymentStatusBadge status={payment.status} />
                ) : (
                  <Skeleton className="h-5 w-20" />
                )}
              </Field>
              <Field label="Summa">
                <span className="font-mono text-sm font-semibold">
                  {payment ? formatPrice(payment.amount) : '—'}
                </span>
              </Field>
              <Field label="Sana">
                <span className="text-xs">
                  {payment
                    ? format(new Date(payment.createdAt), 'd MMM yyyy, HH:mm')
                    : '—'}
                </span>
              </Field>
              {payment?.reviewedAt && (
                <Field label="Tekshirilgan">
                  <span className="text-xs">
                    {format(new Date(payment.reviewedAt), 'd MMM yyyy, HH:mm')}
                  </span>
                </Field>
              )}
              {payment?.rejectionReason && (
                <Field label="Rad etish sababi">
                  <span className="text-xs text-destructive">
                    {payment.rejectionReason}
                  </span>
                </Field>
              )}
              <Field label="ID">
                <span className="font-mono text-xs">#{payment?.id ?? id}</span>
              </Field>
            </CardContent>
          </Card>

          {payment?.user && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Foydalanuvchi</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/users/${payment.userId}`}
                  className="-m-2 flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-subtle"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        payment.user.firstName,
                        payment.user.lastName,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {getFullName(
                        payment.user.firstName,
                        payment.user.lastName,
                      )}
                    </div>
                    {payment.user.username && (
                      <div className="truncate text-xs text-muted-foreground">
                        @{payment.user.username}
                      </div>
                    )}
                  </div>
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    <span className="font-mono">{payment.user.telegramId}</span>
                  </div>
                  {payment.user.phoneNumber && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="font-mono">
                        {payment.user.phoneNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(
                      new Date(payment.user.createdAt),
                      'd MMM yyyy, HH:mm',
                    )}
                    {' da ro\'yxatdan o\'tgan'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PaymentActionDialog
        payment={payment ?? null}
        action={action}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        loading={approveMutation.isPending || rejectMutation.isPending}
      />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
