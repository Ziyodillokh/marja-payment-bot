// Date range URL state hook.
// `?from=YYYY-MM-DD&to=YYYY-MM-DD` parametrlarini o'qib/yozadi.
// Default: bo'sh (filter yo'q). Sahifa o'zi default ko'rsatishni belgilashi mumkin.
// Filter o'zgarsa router.replace bilan URL yangilanadi (back/forward ishlaydi).

'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { DateRange } from '@/lib/date-range';

export function useDateRangeParams(): {
  range: DateRange;
  setRange: (next: DateRange) => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const range = useMemo<DateRange>(() => {
    const from = search.get('from') ?? undefined;
    const to = search.get('to') ?? undefined;
    return { from, to };
  }, [search]);

  const setRange = useCallback(
    (next: DateRange) => {
      const params = new URLSearchParams(search.toString());
      if (next.from) params.set('from', next.from);
      else params.delete('from');
      if (next.to) params.set('to', next.to);
      else params.delete('to');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, search],
  );

  const reset = useCallback(() => {
    setRange({});
  }, [setRange]);

  return { range, setRange, reset };
}
