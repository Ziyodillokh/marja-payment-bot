// Query string'dan kelgan ?from=...&to=... ni Date'ga parse qiladi.
//
// QABUL QILINADIGAN FORMATLAR:
//   1. YYYY-MM-DD     — TASHKENT vaqti deb talqin qilinadi
//                       from -> 00:00 +05:00 (UTC: pred. kun 19:00)
//                       to   -> 23:59:59.999 +05:00 (UTC: o'sha kun 18:59:59.999)
//   2. ISO timestamp  — to'g'ridan-to'g'ri parse (allaqachon UTC)
//
// Noto'g'ri qiymat — undefined.

import { tashkentDayEnd, tashkentDayStart } from './tashkent-time.util';

export function parseDateQuery(
  raw: string | undefined,
  edge: 'start' | 'end' = 'start',
): Date | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value) return undefined;

  // YYYY-MM-DD — Tashkent kun chegaralari
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return edge === 'start' ? tashkentDayStart(value) : tashkentDayEnd(value);
  }

  // To'liq ISO timestamp — to'g'ridan-to'g'ri Date
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
