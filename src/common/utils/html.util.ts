// Telegram HTML parse mode uchun escape util.
// User-generated text (ism, username) ni xabarga qo'shganda XSS-himoyada ham foydali.

export function escapeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// "500000" → "500 000"  (yoki suffix bilan: "500 000 so'm")
export function formatPrice(value: string | number, suffix?: string): string {
  const n =
    typeof value === 'string'
      ? value.replace(/\D/g, '')
      : String(Math.trunc(value));
  const formatted = n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return suffix ? `${formatted} ${suffix}`.trim() : formatted;
}

export function formatDateTime(d: Date): string {
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
