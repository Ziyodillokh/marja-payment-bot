// Inline keyboard generatorlari.

import { InlineKeyboard } from 'grammy';

// Bot tomonida 'pay' callback handler shu satrni kutadi (welcome, retry, broadcast, auto-msg).
export const PAY_BUTTON_DATA = 'pay';

// Welcome ekranidagi tugmalar — to'lov + foydalanuvchi menyusi.
export const payInlineKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text("💳 To'lov qilish", PAY_BUTTON_DATA)
    .row()
    .text('💎 Balansim', 'balance')
    .text('🔗 Referral', 'referral')
    .text('🏆 TOP', 'leaderboard');

export const retryPayInlineKeyboard = (): InlineKeyboard =>
  new InlineKeyboard().text('💳 Qayta to\'lash', PAY_BUTTON_DATA);

export const channelInlineKeyboard = (link: string): InlineKeyboard =>
  new InlineKeyboard().url('🔗 Kanalga o\'tish', link);

// Admin guruhdagi chek ostidagi tugmalar.
export const reviewInlineKeyboard = (paymentId: string): InlineKeyboard =>
  new InlineKeyboard()
    .text('✅ Tasdiqlash', `approve:${paymentId}`)
    .text('❌ Rad etish', `reject:${paymentId}`);

// Approve confirmation
export const approveConfirmKeyboard = (paymentId: string): InlineKeyboard =>
  new InlineKeyboard()
    .text('✅ Ha, tasdiqlash', `approve_confirm:${paymentId}`)
    .text('↩️ Bekor qilish', `approve_cancel:${paymentId}`);

// Reject confirmation
export const rejectConfirmKeyboard = (paymentId: string): InlineKeyboard =>
  new InlineKeyboard()
    .text('✅ Ha, rad etish', `reject_confirm:${paymentId}`)
    .text('↩️ Bekor qilish', `reject_cancel:${paymentId}`);
