// Admin guruhdagi callback'lar:
//  approve / approve_confirm / approve_cancel
//  reject / reject_confirm / reject_cancel
//
// 1. Tekshiramiz: bosgan user shu guruh administrator bo'lishi kerak.
// 2. Tasdiqlash dialogi (yangi xabar) → Ha bosilsa biznes mantiq ishga tushadi.
// 3. Approve da: Payment+User APPROVED, kanalga unban → invite link → user'ga link.
// 4. Reject da: Payment REJECTED, User PHONE_PROVIDED, qayta to'lash tugmasi.
// 5. Original chek caption'i yangilanadi: "TASDIQLANDI by @admin" yoki "RAD ETILDI by @admin".

import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../bot.context';
import {
  approveConfirmKeyboard,
  rejectConfirmKeyboard,
} from '../keyboards/inline.keyboards';
import { BotService } from '../bot.service';

@Injectable()
export class AdminGroupHandler {
  private readonly logger = new Logger(AdminGroupHandler.name);

  constructor(private readonly botService: BotService) {}

  // ─────────── ADMIN TEKSHIRUVI ───────────

  private async ensureAdmin(ctx: BotContext): Promise<boolean> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    if (!chatId || !userId) return false;
    try {
      const member = await ctx.api.getChatMember(chatId, userId);
      const ok =
        member.status === 'administrator' || member.status === 'creator';
      if (!ok) {
        await ctx.answerCallbackQuery({
          text: 'Sizda ruxsat yo\'q.',
          show_alert: true,
        });
      }
      return ok;
    } catch (err) {
      this.logger.warn(`getChatMember failed: ${(err as Error).message}`);
      return false;
    }
  }

  private adminLabel(ctx: BotContext): string {
    return ctx.from?.username
      ? '@' + ctx.from.username
      : ctx.from?.first_name || 'admin';
  }

  // ─────────── 1-bosqich: TASDIQLASH/RAD ETISH dialogi ───────────

  async handleApprove(ctx: BotContext, paymentId: number): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    await ctx.answerCallbackQuery();
    await ctx.reply(
      'Qaroringiz qat\'iymi? Foydalanuvchi yopiq kanalga qo\'shiladi.',
      { reply_markup: approveConfirmKeyboard(paymentId) },
    );
  }

  async handleReject(ctx: BotContext, paymentId: number): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    await ctx.answerCallbackQuery();
    await ctx.reply(
      'Qaroringiz qat\'iymi? Foydalanuvchining to\'lovi rad etiladi.',
      { reply_markup: rejectConfirmKeyboard(paymentId) },
    );
  }

  // ─────────── 2-bosqich: BEKOR QILISH ───────────

  async handleCancel(ctx: BotContext): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    await ctx.answerCallbackQuery();
    try {
      await ctx.deleteMessage();
    } catch {
      // ignore
    }
  }

  // ─────────── 2-bosqich: APPROVE CONFIRM ───────────

  async handleApproveConfirm(
    ctx: BotContext,
    paymentId: number,
  ): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    await ctx.answerCallbackQuery();

    try {
      const result = await this.botService.approvePaymentFlow(paymentId, {
        actorLabel: this.adminLabel(ctx),
      });
      try {
        await ctx.deleteMessage();
      } catch {
        // ignore
      }
      if (result.warning) {
        await ctx.reply(`⚠️ ${result.warning}`);
      }
    } catch (err) {
      this.logger.error(
        `approve failed (#${paymentId}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      await ctx.reply(`❌ Xatolik: ${(err as Error).message}`);
    }
  }

  // ─────────── 2-bosqich: REJECT CONFIRM ───────────

  async handleRejectConfirm(
    ctx: BotContext,
    paymentId: number,
  ): Promise<void> {
    if (!(await this.ensureAdmin(ctx))) return;
    await ctx.answerCallbackQuery();

    try {
      await this.botService.rejectPaymentFlow(paymentId, {
        actorLabel: this.adminLabel(ctx),
      });
      try {
        await ctx.deleteMessage();
      } catch {
        // ignore
      }
    } catch (err) {
      this.logger.error(
        `reject failed (#${paymentId}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      await ctx.reply(`❌ Xatolik: ${(err as Error).message}`);
    }
  }
}
