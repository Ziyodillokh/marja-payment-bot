'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useCreateBroadcast } from '@/lib/queries/useBroadcasts';
import type { BroadcastFilter } from '@/types';

const FILTERS: Array<{
  value: BroadcastFilter;
  label: string;
  hint: string;
}> = [
  { value: 'ALL', label: 'Hammaga', hint: 'Bloklanmagan barcha foydalanuvchilarga' },
  { value: 'PAID', label: "To'lov qilganlar", hint: 'APPROVED status' },
  { value: 'UNPAID', label: "To'lov qilmaganlar", hint: 'NEW + PHONE_PROVIDED' },
  { value: 'PENDING', label: 'Kutilayotganlar', hint: 'PAYMENT_PENDING' },
];

export default function NewBroadcastPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<BroadcastFilter>('ALL');
  const [text, setText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const create = useCreateBroadcast();

  const submit = () => {
    create.mutate(
      { filterType: filter, text },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          router.push('/broadcasts');
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Yangi broadcast"
        breadcrumbs={[
          { label: 'Xabarlar', href: '/broadcasts' },
          { label: 'Yangi' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Step 1: audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>1. Auditoriya</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={filter}
                onValueChange={(v) => setFilter(v as BroadcastFilter)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {FILTERS.map((f) => {
                  const active = filter === f.value;
                  return (
                    <Label
                      key={f.value}
                      htmlFor={`f-${f.value}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        active
                          ? 'border-foreground bg-subtle/60'
                          : 'border-border hover:bg-subtle/40'
                      }`}
                    >
                      <RadioGroupItem id={`f-${f.value}`} value={f.value} />
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{f.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {f.hint}
                        </div>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Step 2: message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>2. Xabar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={8}
                placeholder="Xabar matni (HTML qo'llab-quvvatlanadi: <b>, <i>, <u>, <a>)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {text.length} belgi
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!text.trim()}
            >
              <Send className="h-4 w-4" />
              Yuborish
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Oldindan ko&apos;rish</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-[#0a0a0a] p-4">
                <div className="mx-auto max-w-xs space-y-2">
                  <div className="rounded-2xl rounded-bl-md bg-[#212121] px-3 py-2 text-sm text-white">
                    {text || (
                      <span className="text-white/40">
                        Xabar matni shu yerda ko&apos;rinadi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Auditoriya:</span>
              <span className="font-medium">
                {FILTERS.find((f) => f.value === filter)?.label}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Broadcast'ni yuborilsinmi?"
        description="Bu aksiyani bekor qilib bo'lmaydi (faqat status PENDING bo'lsa)."
        confirmText="Ha, yuborish"
        loading={create.isPending}
        onConfirm={submit}
      />
    </>
  );
}
