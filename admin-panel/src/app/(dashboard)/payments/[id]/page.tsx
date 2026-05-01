'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Check, FileImage, X } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStatusBadge } from '@/components/shared/status-badge';
import { PaymentActionDialog } from '@/components/payments/payment-action-dialog';
import {
  useApprovePayment,
  usePayment,
  useRejectPayment,
} from '@/lib/queries/usePayments';
import { formatPrice, getFullName } from '@/lib/utils';

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Receipt photo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chek</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="aspect-video w-full" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border bg-subtle/40">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="h-8 w-8" />
                  <div className="font-mono text-xs">
                    file_id: {payment?.photoFileId.slice(0, 28)}...
                  </div>
                  <div className="text-xs">
                    Telegram fayllari faqat bot orqali ko&apos;rsatiladi
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Ma&apos;lumot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Status">
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
            {payment?.user && (
              <div className="border-t border-border pt-3">
                <Link
                  href={`/users/${payment.userId}`}
                  className="block rounded-md p-2 transition-colors hover:bg-subtle"
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Foydalanuvchi
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {getFullName(payment.user.firstName, payment.user.lastName)}
                  </div>
                  {payment.user.username && (
                    <div className="text-xs text-muted-foreground">
                      @{payment.user.username}
                    </div>
                  )}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
