'use client';

import { useMemo, useState } from 'react';
import { Link2, Plus } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { UtmSourceCard } from '@/components/utm/utm-source-card';
import { CreateUtmDialog } from '@/components/utm/create-utm-dialog';
import { useUtmSources, useUtmFunnel } from '@/lib/queries/useUtm';

// Bot username — env yoki backend'dan keladigan link'dan ajratamiz.
function extractBotUsername(link?: string): string {
  if (!link) return 'bot';
  const m = link.match(/t\.me\/([^?]+)/);
  return m?.[1] ?? 'bot';
}

export default function UtmSourcesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: sources, isLoading } = useUtmSources();

  // Funnel metricsni source bo'yicha map qilamiz (oxirgi 30 kun, default).
  const { data: funnelData } = useUtmFunnel();
  const metricsBySource = useMemo(() => {
    const map = new Map<string, ReturnType<typeof Object> | null>();
    (funnelData ?? []).forEach((m) => {
      if (m.utmSourceId) map.set(m.utmSourceId, m as never);
    });
    return map;
  }, [funnelData]);

  const botUsername = extractBotUsername(sources?.[0]?.link);

  return (
    <>
      <PageHeader
        title="UTM manbalar"
        subtitle="Reklama kanallaringiz uchun unique linklar yarating va kuzating"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Yangi manba
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : !sources || sources.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Link2}
              title="Hali UTM manba yaratmagansiz"
              description="Birinchi manbani yaratib, har sayt yoki reklama kanali uchun alohida link oling. Bot foydalanuvchi qaysi kanaldan kelganini bilib oladi va statistikani ko'rsatadi."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Birinchi manbani yaratish
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <UtmSourceCard
              key={s.id}
              source={s}
              metrics={metricsBySource.get(s.id) as never}
            />
          ))}
        </div>
      )}

      <CreateUtmDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        botUsername={botUsername}
      />
    </>
  );
}
