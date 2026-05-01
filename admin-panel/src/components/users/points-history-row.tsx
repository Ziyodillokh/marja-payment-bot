// Bitta points transaction yozuvini ko'rsatuvchi reusable row.

import {
  ArrowDown,
  ArrowUp,
  MessageSquare,
  Smile,
  ShoppingCart,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PointsTransaction, PointsTransactionType } from '@/types';

const META: Record<
  PointsTransactionType,
  { label: string; icon: LucideIcon }
> = {
  REFERRAL_START: { label: 'Referral kirdi', icon: UserPlus },
  REFERRAL_PURCHASE: { label: 'Referral sotib oldi', icon: ShoppingCart },
  COMMENT: { label: 'Izoh yozdi', icon: MessageSquare },
  REACTION: { label: 'Reaksiya bosdi', icon: Smile },
  REACTION_REMOVED: { label: 'Reaksiya olib qo\'ydi', icon: Smile },
  ADMIN_ADJUSTMENT: { label: 'Admin tomonidan', icon: Wrench },
};

export function PointsHistoryRow({ tx }: { tx: PointsTransaction }) {
  const meta = META[tx.type];
  const Icon = meta.icon;
  const positive = tx.amount > 0;

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          positive
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">{meta.label}</span>
        </div>
        {tx.description && (
          <div className="truncate text-xs text-muted-foreground">
            {tx.description}
          </div>
        )}
      </div>
      <div className="text-right">
        <div
          className={cn(
            'flex items-center gap-1 font-mono text-sm font-semibold',
            positive ? 'text-success' : 'text-destructive',
          )}
        >
          {positive ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {positive ? '+' : ''}
          {tx.amount}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {format(new Date(tx.createdAt), 'd MMM, HH:mm')}
        </div>
      </div>
    </div>
  );
}
