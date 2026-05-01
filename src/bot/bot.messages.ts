// Bot tomonidan yuboriladigan re-usable xabar matnlari va caption transformerlari.
// Alohida fayl — admin-group.handler ↔ bot.service o'rtasidagi circular importdan saqlaydi.

import { escapeHtml, formatDateTime } from '../common/utils/html.util';
import { retryPayInlineKeyboard } from './keyboards/inline.keyboards';

export const botMessages = {
  buildApprovedCaption(originalCaption: string, actorLabel: string): string {
    return (
      originalCaption +
      `\n\n✅ <b>TASDIQLANDI</b> by ${escapeHtml(actorLabel)} (${formatDateTime(new Date())})`
    );
  },
  buildRejectedCaption(originalCaption: string, actorLabel: string): string {
    return (
      originalCaption +
      `\n\n❌ <b>RAD ETILDI</b> by ${escapeHtml(actorLabel)} (${formatDateTime(new Date())})`
    );
  },
  buildApprovedUserMessage(inviteLink: string): string {
    return (
      `🎉 <b>Tabriklaymiz!</b>\n\n` +
      `To'lovingiz tasdiqlandi va siz kursga qabul qilindingiz!\n\n` +
      `Yopiq kanalga qo'shilish uchun pastdagi link orqali kiring:\n` +
      `${inviteLink}\n\n` +
      `⚠️ Link 24 soat ichida amal qiladi va 1 marta ishlatiladi.`
    );
  },
  rejectedUserMessage:
    `❌ <b>To'lovingiz rad etildi</b>\n\n` +
    `Sabab: To'lov tekshiruvdan o'tmadi.\n` +
    `Iltimos, qaytadan to'lov qiling yoki admin bilan bog'laning.`,
  retryPayKeyboard: retryPayInlineKeyboard,
};
