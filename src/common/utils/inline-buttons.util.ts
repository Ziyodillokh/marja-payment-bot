// Inline keyboard helper — AutoMessage va Broadcast uchun.
//
// Tugma manbalari:
//   1. payButton (Boolean) — agar true bo'lsa, birinchi qator: "💳 To'lov qilish".
//      Bu URL emas, callback_data — mavjud to'lov flow'iga ulanadi (PAY_BUTTON_DATA).
//   2. customButtons (Json) — admin yozgan [{label, url}, ...]. Har biri alohida qator.
//
// Faqat tugma yo'q bo'lsa undefined qaytaramiz, grammY shunda reply_markup'ni qo'shmaydi.

import type { InlineKeyboardMarkup } from 'grammy/types';
import { PAY_BUTTON_DATA } from '../../bot/keyboards/inline.keyboards';

export interface CustomButton {
  label: string;
  url: string;
}

export function isCustomButtonArray(value: unknown): value is CustomButton[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (b) =>
      b &&
      typeof b === 'object' &&
      typeof (b as CustomButton).label === 'string' &&
      typeof (b as CustomButton).url === 'string',
  );
}

export function parseCustomButtons(raw: unknown): CustomButton[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return isCustomButtonArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return isCustomButtonArray(raw) ? raw : [];
}

export function buildInlineKeyboard(
  payButton: boolean,
  customButtons: unknown,
): InlineKeyboardMarkup | undefined {
  const rows: InlineKeyboardMarkup['inline_keyboard'] = [];

  if (payButton) {
    rows.push([{ text: "💳 To'lov qilish", callback_data: PAY_BUTTON_DATA }]);
  }

  for (const b of parseCustomButtons(customButtons)) {
    if (!b.label.trim() || !b.url.trim()) continue;
    rows.push([{ text: b.label, url: b.url }]);
  }

  if (rows.length === 0) return undefined;
  return { inline_keyboard: rows };
}
