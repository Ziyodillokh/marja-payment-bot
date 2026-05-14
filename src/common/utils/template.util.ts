// Template variable substitution — auto-message va broadcast'lar uchun.
//
// Qo'llab-quvvatlanadigan placeholder'lar (case-insensitive):
//   {firstname}  — User.firstName
//   {lastname}   — User.lastName
//   {fullname}   — firstName + " " + lastName (faqat bo'sh bo'lmagan)
//   {username}   — User.username (@ belgisisiz)
//
// Bo'sh qiymat → bo'sh string (placeholder olib tashlanadi, alternativ matn yo'q).
// escapeHtml: true → Telegram parse_mode=HTML uchun xavfsiz (ism ichida `<`,`&`,`>` bo'lsa).

import { escapeHtml } from './html.util';

export interface TemplateUser {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export function renderTemplate(
  template: string,
  user: TemplateUser,
  opts: { escapeHtml?: boolean } = {},
): string {
  const esc = opts.escapeHtml === false
    ? (s: string | null | undefined) => s ?? ''
    : escapeHtml;

  const firstName = esc(user.firstName);
  const lastName = esc(user.lastName);
  const fullName = [firstName, lastName].filter((s) => s).join(' ');
  const username = esc(user.username);

  return template
    .replace(/\{firstname\}/gi, firstName)
    .replace(/\{lastname\}/gi, lastName)
    .replace(/\{fullname\}/gi, fullName)
    .replace(/\{username\}/gi, username);
}

/** Foydalanuvchiga ko'rsatish uchun ro'yxat (UI dropdown'da). */
export const TEMPLATE_VARS = [
  { key: '{firstname}', label: 'Ism', example: 'Salom {firstname}!' },
  { key: '{lastname}', label: 'Familiya', example: 'Hurmatli {lastname}' },
  { key: '{fullname}', label: 'To\'liq ism', example: '{fullname}, xush kelibsiz' },
  { key: '{username}', label: 'Username', example: '@{username} uchun yangilik' },
] as const;
