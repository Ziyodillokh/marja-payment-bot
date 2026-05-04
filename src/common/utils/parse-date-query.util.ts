// Query string'dan kelgan ?from=...&to=... ni Date'ga parse qiladi.
// Frontend ISO formatda ("2026-04-04T00:00:00.000Z") yuboradi (rangeToApiParams).
// Foydalanuvchi qo'lda "2026-04-04" yuborsa ham qabul qilamiz va shu kun
// boshlanishi/oxiri sifatida talqin qilamiz (from -> 00:00, to -> 23:59).
//
// Noto'g'ri qiymat — undefined.

export function parseDateQuery(
  raw: string | undefined,
  edge: 'start' | 'end' = 'start',
): Date | undefined {
  if (!raw) return undefined;

  const value = raw.trim();
  if (!value) return undefined;

  // Faqat sana berilgan bo'lsa (YYYY-MM-DD) — to'liq kunga kengaytiramiz
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T00:00:00.000Z');
    if (Number.isNaN(d.getTime())) return undefined;
    if (edge === 'end') {
      d.setUTCHours(23, 59, 59, 999);
    }
    return d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
