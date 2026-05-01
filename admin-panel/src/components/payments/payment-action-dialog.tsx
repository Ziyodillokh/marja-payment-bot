'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatPrice, getFullName, getInitials } from '@/lib/utils';
import type { Payment } from '@/types';

interface Props {
  payment: Payment | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export function PaymentActionDialog({
  payment,
  action,
  onClose,
  onConfirm,
  loading,
}: Props) {
  const [reason, setReason] = useState('');

  if (!payment || !action) return null;

  const isApprove = action === 'approve';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setReason('');
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isApprove ? "To'lovni tasdiqlash" : "To'lovni rad etish"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "Foydalanuvchi yopiq kanalga qo'shiladi va tasdiq xabari oladi."
              : 'Foydalanuvchi rad xabari oladi va qayta to\'lash imkoniyati beriladi.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-subtle/40 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs">
                {getInitials(payment.user?.firstName, payment.user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {getFullName(payment.user?.firstName, payment.user?.lastName)}
              </div>
              {payment.user?.username && (
                <div className="text-xs text-muted-foreground">
                  @{payment.user.username}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold">
                {formatPrice(payment.amount)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                #{payment.id}
              </div>
            </div>
          </div>
        </div>

        {!isApprove && (
          <div className="space-y-2">
            <Label htmlFor="reason">Sabab (ixtiyoriy)</Label>
            <Textarea
              id="reason"
              placeholder="Masalan: chek aniq emas, summa to'g'ri kelmaydi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Bekor qilish
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={() => onConfirm(reason || undefined)}
            disabled={loading}
          >
            {loading
              ? 'Yuborilmoqda…'
              : isApprove
                ? 'Ha, tasdiqlash'
                : 'Ha, rad etish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
