// Middleware bu sahifani ushlab, /dashboard yoki /login ga yo'naltiradi.
// Lekin loyihani ishonchli bo'lishi uchun:
import { redirect } from 'next/navigation';

export default function HomePage(): never {
  redirect('/dashboard');
}
