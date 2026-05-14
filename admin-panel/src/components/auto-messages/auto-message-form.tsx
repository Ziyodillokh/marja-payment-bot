'use client';

// Auto-message create yoki edit forma. Telegram-style live preview bilan.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateAutoMessage,
  useUpdateAutoMessage,
} from '@/lib/queries/useAutoMessages';
import { MediaUploader } from '@/components/shared/media-uploader';
import {
  MessageButtonsEditor,
  type CustomButton,
} from '@/components/shared/message-buttons-editor';
import { TemplateVarsButton } from '@/components/shared/template-vars-button';
import type { AutoMessage, TriggerType } from '@/types';

// Foydalanuvchi so'roviga ko'ra 2 ta asosiy trigger:
const TRIGGER_OPTIONS: Array<{ value: TriggerType; label: string; hint: string }> = [
  {
    value: 'AFTER_START_NO_PAYMENT',
    label: 'Start bosgan, to\'lov qilmagan',
    hint: 'Foydalanuvchi /start bosib, belgilangan vaqt o\'tib hali to\'lov qilmasa',
  },
  {
    value: 'AFTER_PAYMENT_NO_APPROVAL',
    label: 'Chek yuborgan, kutib turibdi',
    hint: 'Foydalanuvchi chek yuborib, belgilangan vaqt o\'tib hali tasdiqlanmagan',
  },
];

const UNIT_OPTIONS = [
  { value: 'minute', label: 'daqiqa', mul: 60 },
  { value: 'hour', label: 'soat', mul: 3600 },
  { value: 'day', label: 'kun', mul: 86400 },
];

interface Props {
  initial?: AutoMessage;
}

export function AutoMessageForm({ initial }: Props) {
  const router = useRouter();
  const create = useCreateAutoMessage();
  const update = useUpdateAutoMessage();
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Initial qiymatlardan time decompose
  const initialTime = decomposeSeconds(initial?.triggerAfter ?? 3600);

  const [name, setName] = useState(initial?.name ?? '');
  const [triggerType, setTriggerType] = useState<TriggerType>(
    initial?.triggerType ?? 'AFTER_START_NO_PAYMENT',
  );
  const [num, setNum] = useState(String(initialTime.num));
  const [unit, setUnit] = useState(initialTime.unit);
  const [text, setText] = useState(initial?.text ?? '');
  const [mediaFileId, setMediaFileId] = useState<string | null>(
    initial?.mediaFileId ?? null,
  );
  const [mediaType, setMediaType] = useState<string | null>(
    initial?.mediaType ?? null,
  );
  const [videoIsNote, setVideoIsNote] = useState<boolean>(
    initial?.videoIsNote ?? false,
  );
  const [payButton, setPayButton] = useState<boolean>(
    initial?.payButton ?? false,
  );
  const [customButtons, setCustomButtons] = useState<CustomButton[]>(
    Array.isArray(initial?.customButtons)
      ? (initial!.customButtons as CustomButton[])
      : [],
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  // Dumaloq video uchun mavjud media tip mos kelmasa avtomatik o'chiramiz
  // (chunki videoIsNote faqat video uchun ma'noli).
  const wantNoteEffective =
    videoIsNote && (mediaType === 'video' || mediaType === null);

  const triggerAfterSec = (() => {
    const n = parseInt(num, 10);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const u = UNIT_OPTIONS.find((u) => u.value === unit);
    return n * (u?.mul ?? 60);
  })();

  const valid = name.trim() && text.trim() && triggerAfterSec > 0;

  const handleSubmit = async () => {
    if (!valid) return;

    const cleanButtons = customButtons.filter(
      (b) => b.label.trim() && b.url.trim(),
    );

    const payload = {
      name: name.trim(),
      triggerType,
      triggerAfter: triggerAfterSec,
      text: text.trim(),
      mediaFileId: mediaFileId ?? undefined,
      mediaType: mediaType ?? undefined,
      videoIsNote: wantNoteEffective,
      payButton,
      customButtons: cleanButtons,
      isActive,
    };

    if (initial) {
      await update.mutateAsync({ id: initial.id, input: payload });
    } else {
      await create.mutateAsync(payload);
    }
    router.push('/auto-messages');
  };

  const pending = create.isPending || update.isPending;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {/* Name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Asosiy ma&apos;lumot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nom (faqat admin uchun)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: 1 soat eslatma"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger">Qachon yuborilsin</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => setTriggerType(v as TriggerType)}
              >
                <SelectTrigger id="trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vaqt</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={num}
                  onChange={(e) =>
                    setNum(e.target.value.replace(/\D/g, ''))
                  }
                  className="w-32 font-mono"
                />
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center text-xs text-muted-foreground">
                  ≈ {triggerAfterSec} soniya
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media (rasm/video/hujjat) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Media (ixtiyoriy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dumaloq video toggle — video yuklashdan OLDIN belgilanishi kerak,
                chunki upload paytida sendVideoNote yoki sendVideo aniqlanadi. */}
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-subtle/40 px-3 py-2.5 transition-colors hover:bg-subtle">
              <input
                type="checkbox"
                checked={videoIsNote}
                onChange={(e) => {
                  setVideoIsNote(e.target.checked);
                  // Video allaqachon yuklangan bo'lsa, foydalanuvchi qayta yuklashi kerak
                  // (file_id turi har xil: video vs video_note). Shuni ogohlantirish o'rniga
                  // tugmani o'zgartirsa, mavjudni tozalab qo'yamiz.
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
                  Telegram&apos;da dumaloq videoxabar sifatida yuboriladi. Video{' '}
                  <strong>kvadrat</strong> bo&apos;lishi va max{' '}
                  <strong>60 sekund</strong> bo&apos;lishi kerak. Matn alohida
                  xabar sifatida pastida chiqadi.
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

        {/* Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{mediaFileId ? 'Caption' : 'Xabar matni'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              ref={textRef}
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="HTML qo'llab-quvvatlanadi: <b>, <i>, <u>, <a>. Shaxsiylashtirish uchun {firstname}, {fullname} ishlatishingiz mumkin."
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

        {/* Inline tugmalar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Tugmalar</CardTitle>
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

        {/* Active toggle */}
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm font-medium">Faol</div>
              <div className="text-xs text-muted-foreground">
                O&apos;chirilgan auto-xabar yangi userlarga yuborilmaydi
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || pending}>
            <Save className="h-4 w-4" />
            {pending ? 'Saqlanmoqda…' : 'Saqlash'}
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
              <div className="mx-auto max-w-xs">
                <div
                  className="rounded-2xl rounded-bl-md bg-[#212121] px-3 py-2 text-sm text-white"
                  dangerouslySetInnerHTML={{
                    __html: text
                      ? sanitizeHtmlForPreview(text)
                      : '<span class="opacity-40">Xabar shu yerda ko\'rinadi</span>',
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function decomposeSeconds(sec: number): { num: number; unit: string } {
  if (sec >= 86400 && sec % 86400 === 0)
    return { num: sec / 86400, unit: 'day' };
  if (sec >= 3600 && sec % 3600 === 0)
    return { num: sec / 3600, unit: 'hour' };
  return { num: Math.max(1, Math.round(sec / 60)), unit: 'minute' };
}

// Telegram HTML preview uchun: <b>, <i>, <u>, <s>, <a> qoldiramiz, qolganini escape.
function sanitizeHtmlForPreview(html: string): string {
  // Juda oddiy: tasdiqlangan tag'larni qoldiramiz, < > script kabi xavflilarni escape qilamiz.
  // Productionda DOMPurify ishlatish tavsiya etiladi, lekin bu admin-only preview.
  return html.replace(/<(?!\/?(b|i|u|s|a|br|code|pre)\b)[^>]*>/gi, '');
}
