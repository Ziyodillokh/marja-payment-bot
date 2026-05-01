// Inline keyboard generatorlari.

import { InlineKeyboard } from 'grammy';

// Welcome ekranidagi tugmalar — to'lov + foydalanuvchi menyusi.
export const payInlineKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text("💳 To'lov qilish", 'pay')
    .row()
    .text('💎 Balansim', 'balance')
    .text('🔗 Referral', 'referral')
    .text('🏆 TOP', 'leaderboard');

export const retryPayInlineKeyboard = (): InlineKeyboard =>
  new InlineKeyboard().text('💳 Qayta to\'lash', 'pay');

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
