// Yagona date-range yordam funksiyalari.
//
// Sana formati: "YYYY-MM-DD" — URL'da, API'da, butun pipeline'da shu.
// Backend bu sanani **Tashkent vaqti** sifatida talqin qiladi (UTC+5):
//   from=2026-05-04 -> kun boshi 00:00 +05:00 = UTC 2026-05-03T19:00:00Z
//   to=2026-05-04   -> kun oxiri 23:59:59.999 +05:00 = UTC 2026-05-04T18:59:59.999Z
//
// Shuning uchun frontend admin'ning brauzer TZ'iga e'tibor bermaydi —
// "bugun" har doim Tashkent kuni.

import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export const DATE_FORMAT = 'yyyy-MM-dd';

/** "Hozir Tashkent vaqti bo'yicha qaysi sana" → "YYYY-MM-DD" */
export function tashkentTodayString(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

/**
 * Tashkent kunini Date obyektiga aylantirish (date-fns operatsiyalari uchun).
 * Brauzerning local TZ'ida shu yil/oy/kunni qaytaradi — date-fns subDays/format
 * uchun bu yetarli (faqat YYYY-MM-DD ko'rinishidan foydalanamiz).
 */
export function tashkentDate(d: Date = new Date()): Date {
  const [y, m, day] = tashkentTodayString(d).split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function formatDate(d: Date): string {
  return format(d, DATE_FORMAT);
}

export function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Foydalanuvchiga ko'rsatish uchun: "5 May 2026" */
export function displayDate(s: string | undefined): string {
  const d = parseDate(s);
  if (!d) return '—';
  return format(d, 'd MMM yyyy');
}

/**
 * API ga yuborish: YYYY-MM-DD ni o'zgartirmasdan uzatamiz.
 * Backend (parseDateQuery) buni Tashkent kunining boshi/oxiri sifatida
 * tarjima qiladi.
 */
export function rangeToApiParams(
  range: DateRange,
): { from?: string; to?: string } {
  const params: { from?: string; to?: string } = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
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
      const t = tashkentTodayString();
      return { from: t, to: t };
    },
  },
  {
    key: 'last7',
    label: 'Oxirgi 7 kun',
    build: () => {
      const today = tashkentDate();
      return {
        from: formatDate(subDays(today, 6)),
        to: formatDate(today),
      };
    },
  },
  {
    key: 'last30',
    label: 'Oxirgi 30 kun',
    build: () => {
      const today = tashkentDate();
      return {
        from: formatDate(subDays(today, 29)),
        to: formatDate(today),
      };
    },
  },
  {
    key: 'last90',
    label: 'Oxirgi 90 kun',
    build: () => {
      const today = tashkentDate();
      return {
        from: formatDate(subDays(today, 89)),
        to: formatDate(today),
      };
    },
  },
  {
    key: 'thisMonth',
    label: 'Bu oy',
    build: () => {
      const today = tashkentDate();
      return {
        from: formatDate(startOfMonth(today)),
        to: formatDate(endOfMonth(today)),
      };
    },
  },
  {
    key: 'lastMonth',
    label: "O'tgan oy",
    build: () => {
      const prev = subMonths(tashkentDate(), 1);
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
