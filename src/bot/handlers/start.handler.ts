// /start handler — flow'ning kirish nuqtasi.
// 1. /start ref_<id> — referral parametrini parse qiladi (faqat YANGI user uchun).
// 2. APPROVED bo'lsa, kanalga link beradi va to'xtatadi.
// 3. phone yo'q bo'lsa, telefon so'raydi.
// 4. phone bor bo'lsa, welcome bo'limini yuboradi.

import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType, TriggerType, UserStatus } from '@prisma/client';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { requestPhoneKeyboard } from '../keyboards/reply.keyboards';
import { WelcomeHandler } from './welcome.handler';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { PointsService } from '../../points/points.service';
import { UsersService } from '../../users/users.service';
import { BotService } from '../bot.service';
import { escapeHtml, formatPrice } from '../../common/utils/html.util';
import { getFullName } from '../../common/utils/name.util';

@Injectable()
export class StartHandler {
  private readonly logger = new Logger(StartHandler.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly welcomeHandler: WelcomeHandler,
    private readonly autoMessages: AutoMessagesService,
    private readonly referrals: ReferralsService,
    private readonly points: PointsService,
    private readonly users: UsersService,
    private readonly botService: BotService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    if (!user) {
      this.logger.warn('start handler: ctx.dbUser is missing');
      return;
    }

    // ──────── 1. REFERRAL PARSING (faqat yangi user uchun) ────────
    if (ctx.isNewUser) {
      const payload = (ctx.match as string | undefined) || '';
      await this.processReferral(ctx, user.id, payload);
    }

    // ──────── 2. Allaqachon kursdami? ────────
    if (user.status === UserStatus.APPROVED) {
      const inviteLink = await this.settings.get(SETTINGS_KEYS.CHANNEL_INVITE_LINK);
      const text = inviteLink
        ? `Siz allaqachon kursda ishtirok etayapsiz! 🎉\n\nKanalga link: ${inviteLink}`
        : 'Siz allaqachon kursda ishtirok etayapsiz! 🎉';
      await ctx.reply(text);
      return;
    }

    ctx.session.awaitingReceipt = false;

    // ──────── 3. Telefon yo'qmi? ────────
    if (!user.phoneNumber) {
      await ctx.reply(
        'Assalomu alaykum! 👋\n\n' +
          'Botdan foydalanish uchun telefon raqamingizni yuboring.',
        { reply_markup: requestPhoneKeyboard },
      );
      return;
    }

    // ──────── 4. AFTER_START_NO_PAYMENT auto-message ────────
    try {
      await this.autoMessages.scheduleForUser(
        user.id,
        TriggerType.AFTER_START_NO_PAYMENT,
      );
    } catch (err) {
      this.logger.warn(
        `scheduleForUser failed for user #${user.id}: ${(err as Error).message}`,
      );
    }

    // ──────── 5. Welcome ────────
    await this.welcomeHandler.send(ctx);
  }

  // ──────── REFERRAL ────────

  private async processReferral(
    ctx: BotContext,
    newUserId: number,
    payload: string,
  ): Promise<void> {
    const enabled = await this.settings.get(SETTINGS_KEYS.GAMIFICATION_ENABLED);
    if (enabled === 'false') return;

    const referrerId = this.referrals.parseReferralCode(payload);
    if (!referrerId) return;

    const referrer = await this.referrals.acceptReferrer(newUserId, referrerId);
    if (!referrer) return;

    const amountStr = await this.settings.get(SETTINGS_KEYS.POINTS_PER_REFERRAL_START);
    const amount = Number(amountStr || '10');

    const newUser = ctx.dbUser;
    const newUserName = newUser
      ? getFullName(newUser.firstName, newUser.lastName) || (newUser.username ? '@' + newUser.username : `User ${newUser.id}`)
      : `User ${newUserId}`;

    const tx = await this.points.award({
      userId: referrer.id,
      amount,
      type: PointsTransactionType.REFERRAL_START,
      description: `Yangi referral: ${newUserName}`,
      relatedUserId: newUserId,
    });
    if (!tx) return;

    // Referrerga xabar yuborish (best-effort).
    try {
      const updated = await this.users.findById(referrer.id);
      const balance = updated?.points ?? referrer.points + amount;
      await this.botService.bot.api.sendMessage(
        Number(referrer.telegramId),
        `🎉 <b>Sizning referralingiz orqali yangi foydalanuvchi keldi!</b>\n\n` +
          `👤 ${escapeHtml(newUserName)}\n` +
          `➕ <b>+${amount}</b> ball\n` +
          `💎 Hozirgi balans: <b>${formatPrice(balance, '')}</b> ball`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify referrer #${referrer.id}: ${(err as Error).message}`,
      );
    }
  }
}
