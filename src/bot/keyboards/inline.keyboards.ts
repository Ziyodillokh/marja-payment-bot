// Inline keyboard generatorlari.

import { InlineKeyboard } from 'grammy';

// Bot tomonida 'pay' callback handler shu satrni kutadi (welcome, retry, broadcast, auto-msg).
export const PAY_BUTTON_DATA = 'pay';

// Bot tomonida 'program' callback — dastur (kurs) haqida xabar yuboradi.
export const PROGRAM_BUTTON_DATA = 'program';

// Welcome ekranidagi 2 ta asosiy tugma — to'lov va dastur haqida.
// Balansim/Referral/TOP — endi "Dastur haqida" xabari ostida turadi.
export const welcomeInlineKeyboard = (): InlineKeyboard =>
  new InlineKeyboard()
    .text("💳 To'lov qilish", PAY_BUTTON_DATA)
    .text('📋 Dastur haqida', PROGRAM_BUTTON_DATA);

// Eski nomi bilan ham eksport — backward-compat (broadcast/auto-msg payButton uchun ishlatiladi).
export const payInlineKeyboard = welcomeInlineKeyboard;

// Dastur (kurs) haqida xabari ostidagi tugmalar.
// Standart: Balansim, Referral, TOP. Admin custom URL tugmalar qo'sha oladi.
export interface ProgramCustomButton {
  label: string;
  url: string;
}
export const programInlineKeyboard = (
  customButtons: ProgramCustomButton[] = [],
): InlineKeyboard => {
  const kb = new InlineKeyboard()
    .text('💎 Balansim', 'balance')
    .text('🔗 Referral', 'referral')
    .text('🏆 TOP', 'leaderboard');
  for (const b of customButtons) {
    const label = b.label.trim();
    const url = b.url.trim();
    if (!label || !url) continue;
    kb.row().url(label, url);
  }
  return kb;
};

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
