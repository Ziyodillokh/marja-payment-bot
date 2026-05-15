'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, User as UserIcon, Users, X } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useCreateBroadcast } from '@/lib/queries/useBroadcasts';
import { MediaUploader } from '@/components/shared/media-uploader';
import {
  MessageButtonsEditor,
  type CustomButton,
} from '@/components/shared/message-buttons-editor';
import { TemplateVarsButton } from '@/components/shared/template-vars-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/queries/useUsers';
import { getFullName, getInitials } from '@/lib/utils';
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
  const searchParams = useSearchParams();
  // ?userId=<cuid> orqali kelganda — to'g'ridan-to'g'ri shu userga yuborish rejimi
  const targetedUserId = searchParams.get('userId') || null;

  const [filter, setFilter] = useState<BroadcastFilter>(
    targetedUserId ? 'SPECIFIC' : 'ALL',
  );
  const [userIds, setUserIds] = useState<string[]>(
    targetedUserId ? [targetedUserId] : [],
  );
  const [text, setText] = useState('');
  const [mediaFileId, setMediaFileId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [videoIsNote, setVideoIsNote] = useState(false);
  const [payButton, setPayButton] = useState(false);
  const [customButtons, setCustomButtons] = useState<CustomButton[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // ?userId=... param sahifa yuklangandan keyin o'zgarsa, sinxronlash
  useEffect(() => {
    if (targetedUserId) {
      setFilter('SPECIFIC');
      setUserIds([targetedUserId]);
    }
  }, [targetedUserId]);

  const targetedUser = useUser(targetedUserId ?? '');
  const create = useCreateBroadcast();

  const submit = () => {
    create.mutate(
      {
        filterType: filter,
        userIds: filter === 'SPECIFIC' ? userIds : undefined,
        text,
        mediaFileId: mediaFileId ?? undefined,
        mediaType: mediaType ?? undefined,
        videoIsNote: videoIsNote && (mediaType === 'video' || mediaType === null),
        payButton,
        customButtons: customButtons.filter(
          (b) => b.label.trim() && b.url.trim(),
        ),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          router.push('/broadcasts');
        },
      },
    );
  };

  const removeTargetedUser = () => {
    setUserIds([]);
    setFilter('ALL');
    // URL'dan ?userId ni olib tashlaymiz
    const params = new URLSearchParams(searchParams.toString());
    params.delete('userId');
    router.replace(
      `/broadcasts/new${params.toString() ? `?${params.toString()}` : ''}`,
    );
  };

  const canSend =
    !!(text.trim() || mediaFileId) &&
    (filter !== 'SPECIFIC' || userIds.length > 0);

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
            <CardContent className="space-y-3">
              {/* Tanlangan foydalanuvchi (SPECIFIC rejim) */}
              {filter === 'SPECIFIC' && userIds.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-foreground/30 bg-subtle/60 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Yagona foydalanuvchiga:
                    </span>
                    {targetedUser.isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : targetedUser.data ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(
                              targetedUser.data.firstName,
                              targetedUser.data.lastName,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {getFullName(
                            targetedUser.data.firstName,
                            targetedUser.data.lastName,
                          )}
                        </span>
                        {targetedUser.data.username && (
                          <span className="text-xs text-muted-foreground">
                            @{targetedUser.data.username}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {userIds[0].slice(0, 12)}…
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removeTargetedUser}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
                    aria-label="Foydalanuvchini olib tashlash"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Guruh filtrlari — faqat SPECIFIC bo'lmasa ko'rinadi */}
              {filter !== 'SPECIFIC' && (
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
              )}
            </CardContent>
          </Card>

          {/* Step 2: media (ixtiyoriy) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>2. Media (ixtiyoriy)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-subtle/40 px-3 py-2.5 transition-colors hover:bg-subtle">
                <input
                  type="checkbox"
                  checked={videoIsNote}
                  onChange={(e) => {
                    setVideoIsNote(e.target.checked);
                    if (mediaType === 'video') {
                      setMediaFileId(null);
                      setMediaType(null);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-foreground"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Dumaloq video (video note)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Telegram&apos;da dumaloq videoxabar sifatida yuboriladi.{' '}
                    <strong>kvadrat</strong>, max <strong>60 sekund</strong>.
                    Matn alohida pastida chiqadi.
                  </div>
                </div>
              </label>

              <MediaUploader
                fileId={mediaFileId}
                mediaType={mediaType}
                videoIsNote={videoIsNote}
                onChange={(fid, mt) => {
                  setMediaFileId(fid);
                  setMediaType(mt);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Rasm, video, audio yoki hujjat. Matn caption sifatida ishlatiladi.
              </p>
            </CardContent>
          </Card>

          {/* Step 3: message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                3. {mediaFileId ? 'Caption' : 'Xabar'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                ref={textRef}
                rows={8}
                placeholder="Xabar matni (HTML: <b>, <i>, <u>, <a>). Shaxsiylashtirish: {firstname}, {fullname}"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <TemplateVarsButton
                  textareaRef={textRef}
                  value={text}
                  onChange={setText}
                />
                <span className="text-xs text-muted-foreground">
                  {text.length} belgi
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Step 4: tugmalar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>4. Tugmalar (ixtiyoriy)</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageButtonsEditor
                payButton={payButton}
                customButtons={customButtons}
                onPayButtonChange={setPayButton}
                onCustomButtonsChange={setCustomButtons}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Bekor qilish
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canSend}>
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
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-[#212121] px-3 py-2 text-sm text-white">
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
              {filter === 'SPECIFIC' ? (
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">Auditoriya:</span>
              <span className="font-medium">
                {filter === 'SPECIFIC'
                  ? targetedUser.data
                    ? getFullName(
                        targetedUser.data.firstName,
                        targetedUser.data.lastName,
                      )
                    : 'Tanlangan foydalanuvchi'
                  : FILTERS.find((f) => f.value === filter)?.label}
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
