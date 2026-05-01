// BotService — grammY Bot instance markazlashtirilgan.
// - onModuleInit: bot.start() (polling) yoki webhook setup.
// - onModuleDestroy: bot.stop() — graceful shutdown.
// - approvePaymentFlow / rejectPaymentFlow: bot va REST API uchun umumiy biznes mantiq.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, GrammyError, HttpError, session } from 'grammy';
import { Payment, PaymentStatus, PointsTransactionType } from '@prisma/client';

import { BotContext, createInitialSession } from './bot.context';
import { PaymentsService } from '../payments/payments.service';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
import { PointsService } from '../points/points.service';
import { SETTINGS_KEYS } from '../common/enums/settings-keys.enum';
import { botMessages } from './bot.messages';
import {
  escapeHtml,
  formatDateTime,
  formatPrice,
} from '../common/utils/html.util';
import { getFullName } from '../common/utils/name.util';

export interface ApproveFlowResult {
  payment: Payment;
  inviteLink?: string;
  warning?: string;
}

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  public readonly bot: Bot<BotContext>;
  private isStarted = false;

  constructor(
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
    private readonly users: UsersService,
    private readonly settings: SettingsService,
    private readonly points: PointsService,
  ) {
    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error('BOT_TOKEN is not configured');
    }
    this.bot = new Bot<BotContext>(token);

    // Session — in-memory. Productionda Redis adapter ishlatish mumkin.
    this.bot.use(session({ initial: createInitialSession }));

    // Global error handler.
    this.bot.catch((err) => {
      const e = err.error;
      if (e instanceof GrammyError) {
        this.logger.error(`GrammyError: ${e.description}`);
      } else if (e instanceof HttpError) {
        this.logger.error(`HttpError: ${e.message}`);
      } else {
        this.logger.error(`Unknown bot error: ${(e as Error).message}`, (e as Error).stack);
      }
    });
  }

  // ───────── lifecycle ─────────

  async onModuleInit(): Promise<void> {
    // Handlerlar bot.update.ts orqali register qilinadi (BotUpdate provider).
    // Lekin lifecycle order: BotUpdate constructor BotService dan oldin yoki keyin?
    // Nest aniqlab chaqiradi — BotUpdate ham OnModuleInit, u handler'larni register qiladi,
    // keyin bu yerda biz start qilamiz. start() async bo'lib turadi.

    const mode = (this.config.get<string>('BOT_MODE') ?? 'polling').toLowerCase();

    if (mode === 'webhook') {
      const url = this.config.get<string>('BOT_WEBHOOK_URL');
      const secret = this.config.get<string>('BOT_WEBHOOK_SECRET');
      if (!url) throw new Error('BOT_WEBHOOK_URL is required in webhook mode');
      try {
        await this.bot.api.setWebhook(url, {
          secret_token: secret || undefined,
          allowed_updates: ['message', 'callback_query', 'message_reaction'],
        });
        this.logger.log(`Webhook set: ${url}`);
        // Webhook update'larini qabul qilish uchun BotController ishlatiladi.
      } catch (err) {
        this.logger.error(
          `setWebhook failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
      this.isStarted = true;
      return;
    }

    // Polling — sync emas, fire-and-forget.
    try {
      await this.bot.api.deleteWebhook({ drop_pending_updates: false });
    } catch {
      // ignore
    }

    this.bot
      .start({
        allowed_updates: ['message', 'callback_query'],
        onStart: (info) => {
          this.logger.log(`🤖 Bot @${info.username} started (long polling)`);
        },
      })
      .catch((err) => {
        this.logger.error(
          `Bot polling failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
      });

    this.isStarted = true;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.isStarted) return;
    try {
      await this.bot.stop();
      this.logger.log('Bot stopped');
    } catch (err) {
      this.logger.warn(`bot.stop() error: ${(err as Error).message}`);
    }
  }

  // ───────── BIZNES MANTIQ (BOT + API uchun umumiy) ─────────

  /**
   * Tasdiqlash flow: DB approve → kanalga unban → invite link → user'ga xabar →
   * admin guruhdagi original chek caption'ini yangilash.
   */
  async approvePaymentFlow(
    paymentId: number,
    opts: { actorLabel: string; reviewedById?: number },
  ): Promise<ApproveFlowResult> {
    const before = await this.payments.findById(paymentId);
    if (!before) throw new Error(`Payment #${paymentId} not found`);
    if (before.status !== PaymentStatus.PENDING) {
      throw new Error(`Payment #${paymentId} already ${before.status}`);
    }

    const payment = await this.payments.approve(paymentId, opts.reviewedById);
    const user = await this.users.getByIdOrThrow(payment.userId);

    let warning: string | undefined;
    let inviteLink: string | undefined;

    const channelIdStr = await this.settings.get(SETTINGS_KEYS.CHANNEL_ID);
    if (!channelIdStr) {
      warning = 'channel_id setting bo\'sh — invite link yaratilmadi.';
    } else {
      // 1. unban (block qilinmagan user uchun ham xato bermaydi).
      try {
        await this.bot.api.unbanChatMember(channelIdStr, Number(user.telegramId));
      } catch (err) {
        this.logger.warn(
          `unbanChatMember failed (channel ${channelIdStr}): ${(err as Error).message}`,
        );
      }

      // 2. yagona ishlatiladigan, 24 soat amal qiladigan invite link.
      try {
        const expireDate = Math.floor(Date.now() / 1000) + 24 * 3600;
        const link = await this.bot.api.createChatInviteLink(channelIdStr, {
          member_limit: 1,
          expire_date: expireDate,
        });
        inviteLink = link.invite_link;
      } catch (err) {
        this.logger.error(
          `createChatInviteLink failed: ${(err as Error).message}`,
          (err as Error).stack,
        );
        const fallback = await this.settings.get(SETTINGS_KEYS.CHANNEL_INVITE_LINK);
        if (fallback) inviteLink = fallback;
        else warning = (warning ? warning + ' ' : '') + 'Invite link yaratib bo\'lmadi.';
      }
    }

    // 3. User'ga xabar.
    if (inviteLink) {
      try {
        await this.bot.api.sendMessage(
          Number(user.telegramId),
          botMessages.buildApprovedUserMessage(inviteLink),
          { parse_mode: 'HTML' },
        );
      } catch (err) {
        await this.handleSendError(user.id, err);
      }
    } else {
      try {
        await this.bot.api.sendMessage(
          Number(user.telegramId),
          `🎉 <b>Tabriklaymiz!</b>\n\nTo'lovingiz tasdiqlandi! Adminlar siz bilan tez orada bog'lanishadi.`,
          { parse_mode: 'HTML' },
        );
      } catch (err) {
        await this.handleSendError(user.id, err);
      }
    }

    // 4. Admin guruhdagi xabarni edit qilamiz.
    await this.editGroupCaption(payment, (caption) =>
      botMessages.buildApprovedCaption(caption, opts.actorLabel),
    );

    // 5. Referrer ball berish (idempotent — qayta approve qilinsa qayta berilmaydi).
    await this.awardReferralPurchaseBonus(user.id);

    return { payment, inviteLink, warning };
  }

  /**
   * Foydalanuvchining referreri bo'lsa, REFERRAL_PURCHASE bonusini beradi.
   * Idempotency: PointsTransaction da (userId, type, relatedUserId) unique constraint.
   */
  private async awardReferralPurchaseBonus(buyerUserId: number): Promise<void> {
    const buyer = await this.users.findById(buyerUserId);
    if (!buyer || !buyer.referredById) return;

    const enabled = await this.settings.get(SETTINGS_KEYS.GAMIFICATION_ENABLED);
    if (enabled === 'false') return;

    const amountStr = await this.settings.get(
      SETTINGS_KEYS.POINTS_PER_REFERRAL_PURCHASE,
    );
    const amount = Number(amountStr || '50');
    if (amount === 0) return;

    const referrer = await this.users.findById(buyer.referredById);
    if (!referrer) return;

    const buyerName =
      getFullName(buyer.firstName, buyer.lastName) ||
      (buyer.username ? '@' + buyer.username : `User ${buyer.id}`);

    const tx = await this.points.award({
      userId: referrer.id,
      amount,
      type: PointsTransactionType.REFERRAL_PURCHASE,
      description: `Referral kurs sotib oldi: ${buyerName}`,
      relatedUserId: buyer.id,
    });
    if (!tx) return; // allaqachon berilgan

    // Notify referrer.
    try {
      const updated = await this.users.findById(referrer.id);
      const balance = updated?.points ?? referrer.points + amount;
      await this.bot.api.sendMessage(
        Number(referrer.telegramId),
        `💰 <b>Sizning referralingiz kursni sotib oldi!</b>\n\n` +
          `👤 ${escapeHtml(buyerName)}\n` +
          `➕ <b>+${amount}</b> ball\n` +
          `💎 Hozirgi balans: <b>${formatPrice(balance, '')}</b> ball`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      await this.handleSendError(referrer.id, err);
    }
  }

  /**
   * Reject flow: DB reject → user'ga xabar + qayta to'lash tugmasi →
   * admin guruhdagi caption'ni yangilash.
   */
  async rejectPaymentFlow(
    paymentId: number,
    opts: { actorLabel: string; reviewedById?: number; reason?: string },
  ): Promise<Payment> {
    const before = await this.payments.findById(paymentId);
    if (!before) throw new Error(`Payment #${paymentId} not found`);
    if (before.status !== PaymentStatus.PENDING) {
      throw new Error(`Payment #${paymentId} already ${before.status}`);
    }

    const payment = await this.payments.reject(paymentId, opts.reviewedById, opts.reason);
    const user = await this.users.getByIdOrThrow(payment.userId);

    // User'ga xabar.
    try {
      await this.bot.api.sendMessage(
        Number(user.telegramId),
        botMessages.rejectedUserMessage +
          (opts.reason ? `\n\nIzoh: ${opts.reason}` : ''),
        {
          parse_mode: 'HTML',
          reply_markup: botMessages.retryPayKeyboard(),
        },
      );
    } catch (err) {
      await this.handleSendError(user.id, err);
    }

    // Admin guruhdagi xabar.
    await this.editGroupCaption(payment, (caption) =>
      botMessages.buildRejectedCaption(caption, opts.actorLabel),
    );

    return payment;
  }

  // ───────── HELPER ─────────

  private async editGroupCaption(
    payment: Payment,
    transform: (originalCaption: string) => string,
  ): Promise<void> {
    if (!payment.groupChatId || !payment.groupMessageId) return;

    // Telegram'da edit'da eski caption'ni o'qiy olmaymiz — DB'dan qayta quramiz.
    const user = await this.users.findById(payment.userId);
    if (!user) return;

    const baseCaption =
      `💰 <b>To'lov</b>\n\n` +
      `👤 Foydalanuvchi: ${escapeHtml(user.firstName ?? '')} ${escapeHtml(user.lastName ?? '')}\n` +
      `🆔 Telegram ID: <code>${user.telegramId.toString()}</code>\n` +
      `📛 Username: ${user.username ? '@' + escapeHtml(user.username) : '—'}\n` +
      `📞 Telefon: <code>${escapeHtml(user.phoneNumber ?? '—')}</code>\n` +
      `💵 Summa: ${formatPrice(payment.amount.toString())} so'm\n` +
      `🕐 Sana: ${formatDateTime(payment.createdAt)}\n` +
      `🔢 Payment ID: <code>${payment.id}</code>`;

    const newCaption = transform(baseCaption);
    try {
      await this.bot.api.editMessageCaption(
        payment.groupChatId.toString(),
        payment.groupMessageId,
        {
          caption: newCaption,
          parse_mode: 'HTML',
          reply_markup: undefined,
        },
      );
    } catch (err) {
      this.logger.warn(
        `editMessageCaption failed: ${(err as Error).message}`,
      );
    }
  }

  private async handleSendError(userId: number, err: unknown): Promise<void> {
    if (err instanceof GrammyError) {
      // 403 — user botni bloklagan
      if (err.error_code === 403) {
        try {
          await this.users.markBlocked(userId);
        } catch {
          // ignore
        }
        this.logger.warn(`User #${userId} blocked the bot`);
        return;
      }
    }
    this.logger.error(
      `sendMessage failed for user #${userId}: ${(err as Error).message}`,
    );
  }
}
