'use client';

// Admin qo'lda foydalanuvchiga ball qo'shish/olib qo'yish dialogi.

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdjustUserPoints } from '@/lib/queries/useUsers';
import { cn } from '@/lib/utils';

interface Props {
  userId: number;
  userName: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustPointsDialog({
  userId,
  userName,
  currentBalance,
  open,
  onOpenChange,
}: Props) {
  const [direction, setDirection] = useState<'add' | 'sub'>('add');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const adjust = useAdjustUserPoints(userId);

  const handleSubmit = () => {
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    const value = direction === 'add' ? n : -n;
    adjust.mutate(
      { amount: value, reason: reason || undefined },
      {
        onSuccess: () => {
          setAmount('');
          setReason('');
          onOpenChange(false);
        },
      },
    );
  };

  const numeric = parseInt(amount, 10);
  const previewBalance = Number.isFinite(numeric)
    ? currentBalance + (direction === 'add' ? numeric : -numeric)
    : currentBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ball o&apos;zgartirish</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{userName}</span>
            {' uchun ball qo\'shish yoki olib qo\'yish'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('add')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-colors',
                direction === 'add'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-subtle',
              )}
            >
              <Plus className="h-4 w-4" />
              Qo&apos;shish
            </button>
            <button
              type="button"
              onClick={() => setDirection('sub')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-colors',
                direction === 'sub'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:bg-subtle',
              )}
            >
              <Minus className="h-4 w-4" />
              Olib qo&apos;yish
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Ball miqdori</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              className="font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Sabab (ixtiyoriy)</Label>
            <Textarea
              id="reason"
              placeholder="Masalan: bonus, promo, yutuq..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="rounded-md border border-border bg-subtle/40 p-3 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Hozirgi balans</span>
              <span className="font-mono">{currentBalance}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-foreground">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Yangi balans
              </span>
              <span className="font-mono text-base font-semibold">
                {previewBalance}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adjust.isPending}
          >
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || adjust.isPending}
            variant={direction === 'add' ? 'default' : 'destructive'}
          >
            {adjust.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
