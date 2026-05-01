// UTM uchun helper funksiyalar: code rangini hash'dan generatsiya, konversiya
// foiz uchun rang.

// Stable rang palitrasi (8 ta) — code'ning hash'ga qarab tanlanadi.
const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
];

export function utmColorFromCode(code: string): (typeof PALETTE)[number] {
  if (code === 'direct')
    return {
      bg: 'bg-subtle',
      text: 'text-muted-foreground',
      border: 'border-border',
      dot: 'bg-muted-foreground',
    };

  // Oddiy hash (djb2)
  let hash = 5381;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 33) ^ code.charCodeAt(i);
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

// Hex rang chart uchun (Recharts uchun string).
const CHART_HEX = [
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#6366f1', // indigo
];

export function utmHexFromCode(code: string): string {
  if (code === 'direct') return '#9ca3af'; // muted-foreground
  let hash = 5381;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 33) ^ code.charCodeAt(i);
  }
  return CHART_HEX[Math.abs(hash) % CHART_HEX.length];
}

/**
 * Konversiya foizi uchun rang (yumshoq, minimalizm uchun).
 * < 5%   → red
 * 5-15%  → amber
 * 15-25% → blue
 * > 25%  → green
 */
export function conversionColor(pct: number): string {
  if (pct < 5) return 'text-red-600';
  if (pct < 15) return 'text-amber-600';
  if (pct < 25) return 'text-blue-600';
  return 'text-emerald-600';
}

/**
 * Soddalashtirilgan katta raqamlar: 1240 → "1.2K", 140000000 → "140M".
 * Ball/foydalanuvchi soni uchun.
 */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}
