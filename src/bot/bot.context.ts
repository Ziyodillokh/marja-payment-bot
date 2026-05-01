// grammY uchun extended Context.
// - SessionData: oddiy in-memory session (paymentMode bayrog'i va h.k.)
// - dbUser: middleware register qilgandan keyin handler'larga uzatiladigan DB User obyekti

import { Context, SessionFlavor } from 'grammy';
import type { User as DbUser } from '@prisma/client';

export interface SessionData {
  // user "💳 To'lov qilish" bossa true bo'ladi — keyingi rasm chek deb qabul qilinadi.
  awaitingReceipt: boolean;
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    dbUser?: DbUser;
    /** Bu update doirasida user yangi yaratildimi (referral logikasi uchun). */
    isNewUser?: boolean;
  };

export function createInitialSession(): SessionData {
  return { awaitingReceipt: false };
}
