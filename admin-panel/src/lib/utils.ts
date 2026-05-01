import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// 500000 → "500 000"
export function formatNumber(value: string | number): string {
  const n =
    typeof value === 'string' ? value.replace(/[^\d.-]/g, '') : String(value);
  const [int, frac] = n.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac ? `${formattedInt}.${frac}` : formattedInt;
}

// 500000 → "500 000 so'm"
export function formatPrice(value: string | number, suffix = "so'm"): string {
  return `${formatNumber(value)} ${suffix}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  return phone;
}

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const a = (firstName ?? '').trim()[0] ?? '';
  const b = (lastName ?? '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

export function getFullName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || '—';
}
