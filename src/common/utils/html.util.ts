// Telegram HTML parse mode uchun escape util.
// User-generated text (ism, username) ni xabarga qo'shganda XSS-himoyada ham foydali.

export function escapeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// "500000" → "500 000"
export function formatPrice(value: string | number): string {
  const n = typeof value === 'string' ? value.replace(/\D/g, '') : String(Math.trunc(value));
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatDateTime(d: Date): string {
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
