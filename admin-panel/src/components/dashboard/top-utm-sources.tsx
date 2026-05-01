'use client';

// Dashboard widget — top 5 UTM source bo'yicha kelganlar.
// Mini progress bar bilan vizual taqqoslash.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UtmBadge } from '@/components/shared/utm-badge';
import { compactNumber, utmHexFromCode } from '@/lib/utm-helpers';
import type { TopUtmSource } from '@/types';

interface Props {
  data: TopUtmSource[] | undefined;
  loading?: boolean;
}

export function TopUtmSources({ data, loading }: Props) {
  const max = Math.max(...(data?.map((d) => d.totalUsers) ?? [1]), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Top manbalar</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/utm-analytics">
            Hammasini
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Hali ma&apos;lumot yo&apos;q
          </div>
        ) : (
          <ol className="space-y-3">
            {data.map((s, idx) => {
              const pct = (s.totalUsers / max) * 100;
              const color = utmHexFromCode(s.code);
              return (
                <li key={s.utmSourceId ?? 'direct'}>
                  <Link
                    href={
                      s.utmSourceId
                        ? `/utm-analytics?source=${s.utmSourceId}`
                        : `/utm-analytics?source=direct`
                    }
                    className="group flex items-center gap-3"
                  >
                    <span className="w-4 text-right text-xs text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <div className="w-24 shrink-0">
                      <UtmBadge code={s.code} name={s.name} />
                    </div>
                    <div className="relative flex-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-xs font-medium tabular-nums text-foreground">
                      {compactNumber(s.totalUsers)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
