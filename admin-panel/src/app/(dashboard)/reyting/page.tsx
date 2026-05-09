'use client';

// Reyting sahifasi — gamifikatsiya markazi.
// 3 ta tab:
//   1. Reyting       — top users by points (Leaderboard)
//   2. Top referallar — referral count + earned points
//   3. Sozlamalar    — POINTS_PER_*, comment guard'lar, GAMIFICATION_ENABLED
//
// Tepada 3 ta umumiy stat card (eng yaxshi yutuq, eng ko'p referal, jami faol).

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  MessageCircle,
  ThumbsUp,
  Trophy,
  Users as UsersIcon,
  UserPlus,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useLeaderboard, useTopReferrers } from '@/lib/queries/useGamification';
import { useSettings, useUpdateSetting } from '@/lib/queries/useSettings';
import { cn, formatNumber, getFullName, getInitials } from '@/lib/utils';

const SETTINGS_KEYS = {
  POINTS_PER_REFERRAL_START: 'points_per_referral_start',
  POINTS_PER_REFERRAL_PURCHASE: 'points_per_referral_purchase',
  POINTS_PER_COMMENT: 'points_per_comment',
  POINTS_PER_REACTION: 'points_per_reaction',
  GAMIFICATION_ENABLED: 'gamification_enabled',
  MAX_COMMENTS_PER_DAY: 'max_comments_per_day',
  MIN_COMMENT_LENGTH: 'min_comment_length',
  DISCUSSION_GROUP_ID: 'discussion_group_id',
} as const;

export default function ReytingPage() {
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(100);
  const { data: topReferrers, isLoading: refLoading } = useTopReferrers(50);
  const { data: settings } = useSettings();

  const settingsMap = useMemo(
    () =>
      Object.fromEntries(
        (settings ?? []).map((s) => [s.key, s.value]),
      ) as Record<string, string>,
    [settings],
  );

  const enabled = settingsMap[SETTINGS_KEYS.GAMIFICATION_ENABLED] === 'true';

  // Top 3 highlights for stat cards
  const topUser = leaderboard?.items[0];
  const topReferrer = topReferrers?.[0];
  const activePlayers = leaderboard?.items.filter((u) => u.points > 0).length ?? 0;

  return (
    <>
      <PageHeader
        title="Reyting"
        subtitle="Gamifikatsiya — ballar, referallar va sozlamalar"
        actions={
          <Badge variant={enabled ? 'success' : 'muted'} className="text-xs">
            {enabled ? '● Faol' : '○ O\'chirilgan'}
          </Badge>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Yetakchi"
          value={
            topUser
              ? formatNumber(topUser.points) + ' ball'
              : '—'
          }
          icon={Trophy}
          loading={lbLoading}
        />
        <StatCard
          label="Eng ko'p referal"
          value={
            topReferrer
              ? `${topReferrer.referralCount} ta`
              : '—'
          }
          icon={UserPlus}
          loading={refLoading}
        />
        <StatCard
          label="Faol ishtirokchilar"
          value={activePlayers}
          icon={UsersIcon}
          loading={lbLoading}
        />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs defaultValue="leaderboard">
          <TabsList>
            <TabsTrigger value="leaderboard">
              <Trophy className="mr-2 h-3.5 w-3.5" />
              Reyting
            </TabsTrigger>
            <TabsTrigger value="referrers">
              <UserPlus className="mr-2 h-3.5 w-3.5" />
              Top referallar
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Award className="mr-2 h-3.5 w-3.5" />
              Sozlamalar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardTable
              items={leaderboard?.items ?? []}
              loading={lbLoading}
            />
          </TabsContent>

          <TabsContent value="referrers" className="mt-4">
            <ReferrersTable
              items={topReferrers ?? []}
              loading={refLoading}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <GamificationSettings settings={settingsMap} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─────────── LEADERBOARD ───────────

interface LeaderboardEntry {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  points: number;
}

function LeaderboardTable({
  items,
  loading,
}: {
  items: LeaderboardEntry[];
  loading: boolean;
}) {
  if (loading) {
    return <SkeletonRows count={10} />;
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Trophy}
            title="Hali ball topgan foydalanuvchi yo'q"
            description="Foydalanuvchilar izoh, reaksiya va referallardan ball topa boshlaganda bu yerda ko'rinadi"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Ko'p ball topgan top {items.length} ta foydalanuvchi
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {items.map((u, i) => {
            const rank = i + 1;
            return (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-subtle/40"
              >
                <RankBadge rank={rank} />
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(u.firstName, u.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {getFullName(u.firstName, u.lastName)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.username
                      ? `@${u.username}`
                      : `id ${u.telegramId.slice(0, 10)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {formatNumber(u.points)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    ball
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? 'bg-amber-500/15 text-amber-600 ring-amber-500/30'
      : rank === 2
        ? 'bg-zinc-300/30 text-zinc-700 ring-zinc-400/30 dark:text-zinc-300'
        : rank === 3
          ? 'bg-orange-700/15 text-orange-700 ring-orange-700/30'
          : 'bg-subtle text-muted-foreground ring-border';

  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1',
        styles,
      )}
    >
      {rank <= 3 ? <Trophy className="h-3.5 w-3.5" /> : rank}
    </div>
  );
}

// ─────────── TOP REFERRERS ───────────

interface TopReferrer {
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  referralCount: number;
  pointsEarned: number;
}

function ReferrersTable({
  items,
  loading,
}: {
  items: TopReferrer[];
  loading: boolean;
}) {
  if (loading) {
    return <SkeletonRows count={8} />;
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={UserPlus}
            title="Hali referal yo'q"
            description="Foydalanuvchilar referal linki orqali yangi a'zolar olib kelganda bu yerda ko'rinadi"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Eng ko'p referal olib kelganlar — top {items.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {items.map((u, i) => {
            const rank = i + 1;
            return (
              <Link
                key={u.userId}
                href={`/users/${u.userId}`}
                className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-subtle/40"
              >
                <RankBadge rank={rank} />
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {getInitials(u.firstName, u.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {getFullName(u.firstName, u.lastName)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.username ? `@${u.username}` : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {u.referralCount}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      referal
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {formatNumber(u.pointsEarned)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      ball
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────── GAMIFICATION SETTINGS ───────────

function GamificationSettings({
  settings,
}: {
  settings: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <EnabledToggle current={settings[SETTINGS_KEYS.GAMIFICATION_ENABLED]} />
      <PointsAwardCard
        title="Ball miqdorlari"
        description="Har bir tur uchun foydalanuvchiga beriladigan ball"
        items={[
          {
            settingKey: SETTINGS_KEYS.POINTS_PER_REFERRAL_START,
            label: 'Yangi referal qo\'shilganda',
            hint: "Foydalanuvchi referal link orqali ro'yxatdan o'tganda referrer'ga beriladi",
            icon: UserPlus,
            initial: settings[SETTINGS_KEYS.POINTS_PER_REFERRAL_START] ?? '10',
          },
          {
            settingKey: SETTINGS_KEYS.POINTS_PER_REFERRAL_PURCHASE,
            label: "Referal to'lov qilganda",
            hint: 'Referal user kursni sotib olib admin tasdiqlaganda referrer\'ga qo\'shimcha ball',
            icon: Award,
            initial: settings[SETTINGS_KEYS.POINTS_PER_REFERRAL_PURCHASE] ?? '50',
          },
          {
            settingKey: SETTINGS_KEYS.POINTS_PER_COMMENT,
            label: 'Kanal postiga izoh',
            hint: 'Diskussiya guruhda kanal postiga izoh yozganda',
            icon: MessageCircle,
            initial: settings[SETTINGS_KEYS.POINTS_PER_COMMENT] ?? '10',
          },
          {
            settingKey: SETTINGS_KEYS.POINTS_PER_REACTION,
            label: 'Kanal postiga reaksiya',
            hint: 'Reaksiya bosganda. Reaksiya almashtirsa qayta ball olinmaydi.',
            icon: ThumbsUp,
            initial: settings[SETTINGS_KEYS.POINTS_PER_REACTION] ?? '10',
          },
        ]}
      />
      <CommentGuardsCard
        maxPerDay={settings[SETTINGS_KEYS.MAX_COMMENTS_PER_DAY] ?? '10'}
        minLength={settings[SETTINGS_KEYS.MIN_COMMENT_LENGTH] ?? '5'}
      />
      <DiscussionGroupCard
        groupId={settings[SETTINGS_KEYS.DISCUSSION_GROUP_ID] ?? ''}
      />
    </div>
  );
}

function EnabledToggle({ current }: { current: string | undefined }) {
  const enabled = current === 'true';
  const update = useUpdateSetting();

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">Gamifikatsiya yoqilgan</div>
          <div className="text-xs text-muted-foreground">
            O&apos;chirilsa: izoh/reaksiya/referal uchun ball berilmaydi (mavjud
            ballar saqlanadi).
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) =>
            update.mutate({
              key: SETTINGS_KEYS.GAMIFICATION_ENABLED,
              value: v ? 'true' : 'false',
            })
          }
        />
      </CardContent>
    </Card>
  );
}

interface PointsAwardItem {
  settingKey: string;
  label: string;
  hint: string;
  icon: typeof UserPlus;
  initial: string;
}

function PointsAwardCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: PointsAwardItem[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <PointsAwardRow key={it.settingKey} {...it} />
        ))}
      </CardContent>
    </Card>
  );
}

function PointsAwardRow({
  settingKey,
  label,
  hint,
  icon: Icon,
  initial,
}: PointsAwardItem) {
  const [value, setValue] = useState(initial);
  const update = useUpdateSetting();
  useEffect(() => setValue(initial), [initial]);

  const dirty = value !== initial;
  const numeric = value.replace(/\D/g, '');

  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-subtle/30 p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={numeric}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          className="h-8 w-20 text-right font-mono text-sm"
        />
        <span className="text-xs text-muted-foreground">ball</span>
        <Button
          size="sm"
          variant={dirty ? 'default' : 'outline'}
          disabled={!dirty || update.isPending || !numeric}
          onClick={() => update.mutate({ key: settingKey, value: numeric })}
        >
          Saqlash
        </Button>
      </div>
    </div>
  );
}

function CommentGuardsCard({
  maxPerDay,
  minLength,
}: {
  maxPerDay: string;
  minLength: string;
}) {
  const [max, setMax] = useState(maxPerDay);
  const [min, setMin] = useState(minLength);
  const update = useUpdateSetting();

  useEffect(() => setMax(maxPerDay), [maxPerDay]);
  useEffect(() => setMin(minLength), [minLength]);

  const dirty = max !== maxPerDay || min !== minLength;

  const save = async () => {
    if (max !== maxPerDay) {
      await update.mutateAsync({
        key: SETTINGS_KEYS.MAX_COMMENTS_PER_DAY,
        value: max,
      });
    }
    if (min !== minLength) {
      await update.mutateAsync({
        key: SETTINGS_KEYS.MIN_COMMENT_LENGTH,
        value: min,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Izoh chegaralari</CardTitle>
        <p className="text-xs text-muted-foreground">
          Spam'dan himoyalanish — qisqa yoki haddan tashqari ko'p izoh ball
          olmaydi
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max-day">Kuniga maksimal izoh (ball uchun)</Label>
            <Input
              id="max-day"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-len">Minimal uzunlik (belgilarda)</Label>
            <Input
              id="min-len"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="font-mono"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            onClick={save}
          >
            Saqlash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscussionGroupCard({ groupId }: { groupId: string }) {
  const [value, setValue] = useState(groupId);
  const update = useUpdateSetting();
  useEffect(() => setValue(groupId), [groupId]);

  const dirty = value !== groupId;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Diskussiya guruhi ID
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Kanalga ulangan muhokama guruhi. Bot u yerda member yoki admin
          bo&apos;lishi va kanal post&apos;lariga izohlarni o&apos;qiy olishi
          kerak.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="-1001234567890"
            className="font-mono"
          />
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            onClick={() =>
              update.mutate({
                key: SETTINGS_KEYS.DISCUSSION_GROUP_ID,
                value,
              })
            }
          >
            Saqlash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────── HELPERS ───────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </CardContent>
    </Card>
  );
}
