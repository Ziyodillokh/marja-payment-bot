// Yagona date-range yordam funksiyalari.
// Format: "YYYY-MM-DD" — URL parametrida shu, server tomondan ham shu.
// Server bu sanani parse qilganda `from` -> 00:00:00, `to` -> 23:59:59 deb
// kengaytiradi (full-day inclusion).

import {
  endOfDay,
  endOfMonth,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export const DATE_FORMAT = 'yyyy-MM-dd';

export function formatDate(d: Date): string {
  return format(d, DATE_FORMAT);
}

export function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Foydalanuvchiga ko'rsatish uchun ISO -> ko'rinarli format. */
export function displayDate(s: string | undefined): string {
  const d = parseDate(s);
  if (!d) return '—';
  return format(d, 'd MMM yyyy');
}

/** API ga yuborish uchun: full-day inclusive ISO timestamps. */
export function rangeToApiParams(
  range: DateRange,
): { from?: string; to?: string } {
  const params: { from?: string; to?: string } = {};
  if (range.from) {
    const d = parseDate(range.from);
    if (d) params.from = startOfDay(d).toISOString();
  }
  if (range.to) {
    const d = parseDate(range.to);
    if (d) params.to = endOfDay(d).toISOString();
  }
  return params;
}

/** Preset diapazonlari — Last/This/All variantlari. */
export interface DatePreset {
  key: string;
  label: string;
  build: () => DateRange;
}

export const DATE_PRESETS: DatePreset[] = [
  {
    key: 'today',
    label: 'Bugun',
    build: () => {
      const now = new Date();
      return { from: formatDate(now), to: formatDate(now) };
    },
  },
  {
    key: 'last7',
    label: 'Oxirgi 7 kun',
    build: () => {
      const now = new Date();
      return { from: formatDate(subDays(now, 6)), to: formatDate(now) };
    },
  },
  {
    key: 'last30',
    label: 'Oxirgi 30 kun',
    build: () => {
      const now = new Date();
      return { from: formatDate(subDays(now, 29)), to: formatDate(now) };
    },
  },
  {
    key: 'last90',
    label: 'Oxirgi 90 kun',
    build: () => {
      const now = new Date();
      return { from: formatDate(subDays(now, 89)), to: formatDate(now) };
    },
  },
  {
    key: 'thisMonth',
    label: 'Bu oy',
    build: () => {
      const now = new Date();
      return {
        from: formatDate(startOfMonth(now)),
        to: formatDate(endOfMonth(now)),
      };
    },
  },
  {
    key: 'lastMonth',
    label: "O'tgan oy",
    build: () => {
      const prev = subMonths(new Date(), 1);
      return {
        from: formatDate(startOfMonth(prev)),
        to: formatDate(endOfMonth(prev)),
      };
    },
  },
  {
    key: 'all',
    label: 'Hammasi',
    build: () => ({}),
  },
];

/** Berilgan range hozirgi qaysi preset'ga to'g'ri keladi? Aniq mos kelmasa undefined. */
export function detectPreset(range: DateRange): string | undefined {
  for (const p of DATE_PRESETS) {
    const built = p.build();
    if (built.from === range.from && built.to === range.to) return p.key;
  }
  return undefined;
}

/** Range bo'sh emasmi? */
export function hasDateRange(range: DateRange): boolean {
  return Boolean(range.from || range.to);
}

/** Default range — "Oxirgi 30 kun". */
export function defaultDateRange(): DateRange {
  return DATE_PRESETS.find((p) => p.key === 'last30')!.build();
}
