'use client';

import Link from 'next/link';
import { Clock, Plus, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useAutoMessages,
  useDeleteAutoMessage,
  useUpdateAutoMessage,
} from '@/lib/queries/useAutoMessages';
import type { TriggerType } from '@/types';

const TRIGGER_LABELS: Record<TriggerType, string> = {
  AFTER_START_NO_PAYMENT: '/start dan keyin',
  AFTER_PHONE_NO_PAYMENT: 'Telefon bergandan keyin',
  AFTER_PAYMENT_NO_APPROVAL: "To'lovdan keyin",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} soniya`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} daqiqa`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} soat`;
  return `${Math.round(seconds / 86400)} kun`;
}

export default function AutoMessagesPage() {
  const { data, isLoading } = useAutoMessages();
  const updateM = useUpdateAutoMessage();
  const deleteM = useDeleteAutoMessage();

  return (
    <>
      <PageHeader
        title="Avtomatik xabarlar"
        subtitle="Foydalanuvchi belgilangan vaqt o'tib aksiya qilmasa yuboriladigan xabarlar"
        actions={
          <Button asChild>
            <Link href="/auto-messages/new">
              <Plus className="h-4 w-4" />
              Yangi
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Clock}
              title="Hali avto-xabar yaratilmagan"
              description="Yangi tugmasini bosing va birinchi avtomatik xabarni qo'shing"
              action={
                <Button asChild>
                  <Link href="/auto-messages/new">
                    <Plus className="h-4 w-4" />
                    Yangi
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-tighter">
                      {m.name}
                    </h3>
                    <Badge variant={m.isActive ? 'success' : 'muted'}>
                      {m.isActive ? 'Faol' : 'Pauza'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{TRIGGER_LABELS[m.triggerType]}</span>
                    <span>·</span>
                    <span>{formatDuration(m.triggerAfter)}</span>
                  </div>
                </div>
                <Switch
                  checked={m.isActive}
                  onCheckedChange={(v) =>
                    updateM.mutate({ id: m.id, input: { isActive: v } })
                  }
                />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {m.text}
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/auto-messages/${m.id}`}>Tahrirlash</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("O'chirilsinmi?")) deleteM.mutate(m.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
