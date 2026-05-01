'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CreditCard,
  DollarSign,
  FileText,
  Hash,
  Link as LinkIcon,
  Loader2,
  Save,
  UploadCloud,
  Video,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { SettingSection } from '@/components/content/setting-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings, useUpdateSetting, useUploadVideo } from '@/lib/queries/useSettings';
import { formatCardNumber, formatPrice } from '@/lib/utils';

const KEYS = {
  WELCOME_VIDEO_FILE_ID: 'welcome_video_file_id',
  WELCOME_TEXT: 'welcome_text',
  CARD_NUMBER: 'card_number',
  CARD_HOLDER: 'card_holder',
  COURSE_PRICE: 'course_price',
  CHANNEL_ID: 'channel_id',
  CHANNEL_INVITE_LINK: 'channel_invite_link',
  ADMIN_GROUP_ID: 'admin_group_id',
} as const;

export default function ContentPage() {
  const { data: settings, isLoading } = useSettings();
  const map = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, s.value]),
  ) as Record<string, string>;

  return (
    <>
      <PageHeader
        title="Kontent"
        subtitle="Welcome ekrani, to'lov ma'lumotlari va kanal sozlamalari"
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <WelcomeVideoSection currentFileId={map[KEYS.WELCOME_VIDEO_FILE_ID]} />
          <WelcomeTextSection initial={map[KEYS.WELCOME_TEXT] ?? ''} />
          <CardSection
            initialNumber={map[KEYS.CARD_NUMBER] ?? ''}
            initialHolder={map[KEYS.CARD_HOLDER] ?? ''}
          />
          <PriceSection initial={map[KEYS.COURSE_PRICE] ?? ''} />
          <ChannelSection
            channelId={map[KEYS.CHANNEL_ID] ?? ''}
            inviteLink={map[KEYS.CHANNEL_INVITE_LINK] ?? ''}
            adminGroupId={map[KEYS.ADMIN_GROUP_ID] ?? ''}
          />
        </div>
      )}
    </>
  );
}

// ─────────── WELCOME VIDEO ───────────

function WelcomeVideoSection({ currentFileId }: { currentFileId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadVideo();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('Fayl juda katta (max 50MB)');
      return;
    }
    upload.mutate(file);
  };

  return (
    <SettingSection
      icon={Video}
      title="Welcome video"
      description="Bot foydalanuvchini birinchi marta uchratganda yuboradigan video. Telegram'ga upload qilingandan keyin file_id saqlanadi."
    >
      <div className="space-y-3">
        {currentFileId && (
          <div className="rounded-md border border-border bg-subtle/40 p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Joriy file_id
            </div>
            <div className="mt-1 font-mono text-xs text-foreground">
              {currentFileId.slice(0, 64)}
              {currentFileId.length > 64 && '...'}
            </div>
          </div>
        )}

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? 'border-foreground bg-subtle'
              : 'border-border hover:border-foreground/30 hover:bg-subtle/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {upload.isPending ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <div className="text-sm font-medium">Yuklanmoqda…</div>
            </>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm font-medium">
                Faylni shu yerga tashlang yoki bosing
              </div>
              <div className="text-xs text-muted-foreground">
                MP4, MOV · max 50MB
              </div>
            </>
          )}
        </label>
      </div>
    </SettingSection>
  );
}

// ─────────── WELCOME TEXT ───────────

function WelcomeTextSection({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const update = useUpdateSetting();

  useEffect(() => setValue(initial), [initial]);

  return (
    <SettingSection
      icon={FileText}
      title="Welcome matni"
      description="HTML qo'llab-quvvatlanadi: <b>, <i>, <u>, <a>. Telegram'ning HTML parse mode bo'yicha."
    >
      <div className="space-y-3">
        <Textarea
          rows={8}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="🎓 Bizning kursga xush kelibsiz..."
          className="font-mono text-xs"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {value.length} belgi
          </span>
          <Button
            onClick={() =>
              update.mutate({ key: KEYS.WELCOME_TEXT, value })
            }
            disabled={update.isPending || value === initial}
          >
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </div>
    </SettingSection>
  );
}

// ─────────── CARD ───────────

function CardSection({
  initialNumber,
  initialHolder,
}: {
  initialNumber: string;
  initialHolder: string;
}) {
  const [number, setNumber] = useState(initialNumber);
  const [holder, setHolder] = useState(initialHolder);
  const update = useUpdateSetting();

  useEffect(() => setNumber(initialNumber), [initialNumber]);
  useEffect(() => setHolder(initialHolder), [initialHolder]);

  const dirty = number !== initialNumber || holder !== initialHolder;

  const save = async () => {
    if (number !== initialNumber) {
      await update.mutateAsync({ key: KEYS.CARD_NUMBER, value: number });
    }
    if (holder !== initialHolder) {
      await update.mutateAsync({ key: KEYS.CARD_HOLDER, value: holder });
    }
  };

  return (
    <SettingSection
      icon={CreditCard}
      title="Karta ma'lumotlari"
      description="Foydalanuvchilar to'lov qilish uchun ko'radigan karta raqami"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Karta raqami</Label>
            <Input
              id="cardNumber"
              value={number}
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="font-mono"
              maxLength={19}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardHolder">Karta egasi</Label>
            <Input
              id="cardHolder"
              value={holder}
              onChange={(e) => setHolder(e.target.value.toUpperCase())}
              placeholder="ISMI FAMILIYASI"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending || !dirty}>
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </div>
    </SettingSection>
  );
}

// ─────────── PRICE ───────────

function PriceSection({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const update = useUpdateSetting();
  useEffect(() => setValue(initial), [initial]);

  const numeric = value.replace(/\D/g, '');

  return (
    <SettingSection
      icon={DollarSign}
      title="Kurs narxi"
      description="So'mda. Foydalanuvchiga to'lov ekranida ko'rsatiladi."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="price">Narx</Label>
          <Input
            id="price"
            value={numeric}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            placeholder="500000"
            inputMode="numeric"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Ko&apos;rinishi: <strong className="font-mono text-foreground">{numeric ? formatPrice(numeric) : '—'}</strong>
          </p>
        </div>
        <Button
          onClick={() =>
            update.mutate({ key: KEYS.COURSE_PRICE, value: numeric })
          }
          disabled={update.isPending || numeric === initial}
        >
          <Save className="h-4 w-4" />
          Saqlash
        </Button>
      </div>
    </SettingSection>
  );
}

// ─────────── CHANNEL ───────────

function ChannelSection({
  channelId,
  inviteLink,
  adminGroupId,
}: {
  channelId: string;
  inviteLink: string;
  adminGroupId: string;
}) {
  const [chId, setChId] = useState(channelId);
  const [link, setLink] = useState(inviteLink);
  const [groupId, setGroupId] = useState(adminGroupId);
  const update = useUpdateSetting();

  useEffect(() => setChId(channelId), [channelId]);
  useEffect(() => setLink(inviteLink), [inviteLink]);
  useEffect(() => setGroupId(adminGroupId), [adminGroupId]);

  const dirty =
    chId !== channelId || link !== inviteLink || groupId !== adminGroupId;

  const save = async () => {
    if (chId !== channelId) {
      await update.mutateAsync({ key: KEYS.CHANNEL_ID, value: chId });
    }
    if (link !== inviteLink) {
      await update.mutateAsync({ key: KEYS.CHANNEL_INVITE_LINK, value: link });
    }
    if (groupId !== adminGroupId) {
      await update.mutateAsync({ key: KEYS.ADMIN_GROUP_ID, value: groupId });
    }
  };

  return (
    <SettingSection
      icon={Hash}
      title="Kanal va admin guruh"
      description="Tasdiqlangan foydalanuvchilar qo'shiladigan yopiq kanal va cheklar tushadigan admin guruh"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="chId">Yopiq kanal ID</Label>
          <Input
            id="chId"
            value={chId}
            onChange={(e) => setChId(e.target.value)}
            placeholder="-1001234567890"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">
            <LinkIcon className="mr-1 inline h-3 w-3" />
            Default invite link (zaxira)
          </Label>
          <Input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://t.me/+..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="groupId">Admin guruh ID</Label>
          <Input
            id="groupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="-1001234567890"
            className="font-mono"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={update.isPending || !dirty}>
            <Save className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </div>
    </SettingSection>
  );
}
