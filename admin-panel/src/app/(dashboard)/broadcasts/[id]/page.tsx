'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle2, Edit3, Send, Trash2, XCircle } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BroadcastStatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  useBroadcast,
  useCancelBroadcast,
  useDeleteBroadcastMessages,
  useEditBroadcast,
} from '@/lib/queries/useBroadcasts';

const FILTER_LABELS: Record<string, string> = {
  ALL: 'Hammaga',
  PAID: "To'lov qilganlar",
  UNPAID: "To'lov qilmaganlar",
  PENDING: 'Kutilmoqda',
  SPECIFIC: 'Tanlanganlarga',
};

interface RecipientStats {
  total: number;
  sent: number;
  failed: number;
  edited: number;
}

export default function BroadcastDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading } = useBroadcast(id);
  const broadcast = data as
    | (typeof data & { recipients?: RecipientStats })
    | undefined;

  const router = useRouter();
  const editM = useEditBroadcast(id);
  const cancelM = useCancelBroadcast();
  const deleteM = useDeleteBroadcastMessages();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (broadcast?.text) setText(broadcast.text);
  }, [broadcast?.text]);

  const handleSave = () => {
    editM.mutate(
      { text: text.trim() },
      {
        onSuccess: () => {
          setEditing(false);
          setConfirmOpen(false);
        },
      },
    );
  };

  const recipients = broadcast?.recipients;
  const sentCount = broadcast?.sentCount ?? 0;
  const totalCount = broadcast?.totalCount ?? 0;
  const progress =
    totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <>
      <PageHeader
        title={`Xabar #${id}`}
        breadcrumbs={[
          { label: 'Xabarlar', href: '/broadcasts' },
          { label: `#${id}` },
        ]}
        actions={
          broadcast &&
          !editing && (
            <>
              <Button onClick={() => setEditing(true)} variant="outline">
                <Edit3 className="h-4 w-4" />
                Tahrirlash
              </Button>
              {broadcast.status === 'PENDING' && (
                <Button
                  onClick={() => setCancelOpen(true)}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Bekor qilish
                </Button>
              )}
              {(broadcast.status === 'SENDING' ||
                broadcast.status === 'COMPLETED') && (
                <Button
                  onClick={() => setDeleteOpen(true)}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  O&apos;chirish
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main: text/edit */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Xabar matni</CardTitle>
              {broadcast && <BroadcastStatusBadge status={broadcast.status} />}
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : editing ? (
                <>
                  <Textarea
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                    ⚠️ Saqlasangiz, allaqachon yuborilgan barcha
                    foydalanuvchilarning xabari Telegram&apos;da
                    yangilanadi (faqat 48 soat ichida).
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setText(broadcast?.text ?? '');
                      }}
                      disabled={editM.isPending}
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      onClick={() => setConfirmOpen(true)}
                      disabled={
                        editM.isPending ||
                        !text.trim() ||
                        text === broadcast?.text
                      }
                    >
                      <Send className="h-4 w-4" />
                      Saqlash va yangilash
                    </Button>
                  </div>
                </>
              ) : (
                <div className="whitespace-pre-wrap rounded-md border border-border bg-subtle/40 p-4 text-sm">
                  {broadcast?.text}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Telegram preview */}
          {!editing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Telegram&apos;dagi ko&apos;rinishi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-[#0a0a0a] p-4">
                  <div className="mx-auto max-w-xs">
                    <div
                      className="rounded-2xl rounded-bl-md bg-[#212121] px-3 py-2 text-sm text-white"
                      dangerouslySetInnerHTML={{
                        __html: broadcast?.text
                          ? broadcast.text.replace(
                              /<(?!\/?(b|i|u|s|a|br|code|pre)\b)[^>]*>/gi,
                              '',
                            )
                          : '',
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Statistika</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Yuborildi</span>
                  <span className="font-mono">
                    {sentCount}/{totalCount}
                  </span>
                </div>
                <Progress value={progress} />
              </div>
              {recipients && (
                <div className="space-y-2 border-t border-border pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      Muvaffaqiyatli
                    </span>
                    <span className="font-mono">{recipients.sent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Edit3 className="h-3 w-3 text-warning" />
                      Tahrirlangan
                    </span>
                    <span className="font-mono">{recipients.edited}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <XCircle className="h-3 w-3 text-destructive" />
                      Xatolik
                    </span>
                    <span className="font-mono">{recipients.failed}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Ma&apos;lumot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Auditoriya">
                <span className="text-xs">
                  {FILTER_LABELS[broadcast?.filterType ?? ''] ?? '—'}
                </span>
              </Field>
              <Field label="Yaratilgan">
                <span className="text-xs">
                  {broadcast
                    ? format(new Date(broadcast.createdAt), 'd MMM yyyy, HH:mm')
                    : '—'}
                </span>
              </Field>
              {broadcast?.completedAt && (
                <Field label="Yakunlangan">
                  <span className="text-xs">
                    {format(
                      new Date(broadcast.completedAt),
                      'd MMM yyyy, HH:mm',
                    )}
                  </span>
                </Field>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xabar tahrirlansinmi?"
        description={
          recipients
            ? `${recipients.sent} ta foydalanuvchi telegramda xabarni yangilangan ko'radi.`
            : ''
        }
        confirmText="Ha, yangilash"
        loading={editM.isPending}
        onConfirm={handleSave}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Broadcast bekor qilinsinmi?"
        description="Hali yuborilmagan xabar bekor qilinadi. Bu amalni qaytarib bo'lmaydi."
        confirmText="Ha, bekor qilish"
        loading={cancelM.isPending}
        onConfirm={() =>
          cancelM.mutate(id, {
            onSuccess: () => {
              setCancelOpen(false);
              router.push('/broadcasts');
            },
          })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xabar foydalanuvchilardan o'chirilsinmi?"
        description={
          (recipients
            ? `${recipients.sent + recipients.edited} ta foydalanuvchi chatidan xabar o'chiriladi. `
            : '') +
          "Telegram cheklovi: bot 48 soatdan eski xabarlarni o'chira olmaydi — eski xabarlar foydalanuvchilarda qoladi."
        }
        confirmText="Ha, o'chirish"
        loading={deleteM.isPending}
        onConfirm={() =>
          deleteM.mutate(id, {
            onSuccess: () => setDeleteOpen(false),
          })
        }
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
