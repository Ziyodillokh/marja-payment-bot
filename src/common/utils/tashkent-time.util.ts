// Tashkent vaqti yordamchilari (UTC+5, DST yo'q).
//
// Maqsad: barcha sana filtrlari va "bugun" hisob-kitoblari server'ning local
// timezone'iga emas, Tashkent vaqtiga asoslangan bo'lishi. Shu tufayli admin
// qaysi TZ'da yashashidan qat'iy nazar, "bugun = Tashkent bugun".
//
// DB'da timestamp UTC sifatida saqlanadi (Prisma default). Bu yerda biz UTC
// Date obyektlarini qaytaramiz, ammo ular Tashkent kunining boshlanishi/oxiriga
// to'g'ri keladi.

const TASHKENT_OFFSET_HOURS = 5;

/**
 * Tashkent vaqti bo'yicha "YYYY-MM-DD" → kun boshi (00:00 +05:00) UTC Date.
 * Misol: "2026-05-04" → 2026-05-03T19:00:00.000Z
 */
export function tashkentDayStart(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  // -5 hours = previous day 19:00 UTC = 00:00 +05:00
  return new Date(Date.UTC(y, m - 1, d, -TASHKENT_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Tashkent vaqti bo'yicha "YYYY-MM-DD" → kun oxiri (23:59:59.999 +05:00) UTC Date.
 * Misol: "2026-05-04" → 2026-05-04T18:59:59.999Z
 */
export function tashkentDayEnd(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  // 23 - 5 = 18:59:59.999 UTC = 23:59:59.999 +05:00
  return new Date(Date.UTC(y, m - 1, d, 24 - TASHKENT_OFFSET_HOURS - 1, 59, 59, 999));
}

/** "Hozir Tashkent vaqti bo'yicha qaysi sana" → "YYYY-MM-DD" */
export function tashkentTodayString(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Tashkent',
  });
}

/** Tashkent vaqti bo'yicha bugungi kun boshi (UTC Date) */
export function tashkentTodayStart(): Date {
  return tashkentDayStart(tashkentTodayString());
}
