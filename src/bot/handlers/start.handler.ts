// /start handler — flow'ning kirish nuqtasi.
//
// Start parametri formati:
//   src_<code>             — UTM manba (faqat YANGI user uchun yoziladi: first-touch)
//   ref_<cuid>             — Referral (yangi user uchun)
//   src_<code>_ref_<cuid>  — Ikkalasi
//   <code>                 — Legacy plain UTM kod
//
// Flow:
//   1. Start paramni parse qilish (UTM + referral)
//   2. UTM source'ni qabul qilish (first-touch)
//   3. Referral'ni qabul qilish (ball berish)
//   4. APPROVED bo'lsa kanalga link
//   5. Welcome bo'limi (telefon majburiy emas)

import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType, TriggerType, UserStatus } from '@prisma/client';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { WelcomeHandler } from './welcome.handler';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { PointsService } from '../../points/points.service';
import { UsersService } from '../../users/users.service';
import { UtmService } from '../../utm/utm.service';
import { BotService } from '../bot.service';
import { escapeHtml, formatPrice } from '../../common/utils/html.util';
import { getFullName } from '../../common/utils/name.util';
import { parseStartParam } from '../utils/start-param.parser';

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
    private readonly utm: UtmService,
    private readonly botService: BotService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    if (!user) {
      this.logger.warn('start handler: ctx.dbUser is missing');
      return;
    }

    // ──────── 1. Start paramni parse qilish ────────
    const payload = (ctx.match as string | undefined) || '';
    const parsed = parseStartParam(payload);

    // ──────── 2. UTM SOURCE (first-touch — faqat yangi user) ────────
    if (ctx.isNewUser && parsed.utmCode) {
      try {
        const source = await this.utm.findActiveByCode(parsed.utmCode);
        if (source) {
          const ok = await this.users.setUtmSourceIfMissing(
            user.id,
            source.id,
            parsed.raw,
          );
          if (ok) {
            this.logger.log(
              `User #${user.id} attributed to UTM "${source.code}"`,
            );
          }
        } else {
          this.logger.debug(
            `UTM code "${parsed.utmCode}" topilmadi yoki nofaol`,
          );
        }
      } catch (err) {
        this.logger.warn(`UTM attribution failed: ${(err as Error).message}`);
      }
    }

    // ──────── 3. REFERRAL (faqat yangi user) ────────
    if (ctx.isNewUser && parsed.referrerId) {
      await this.processReferral(ctx, user.id, parsed.referrerId);
    }

    // ──────── 4. Allaqachon kursdami? ────────
    if (user.status === UserStatus.APPROVED) {
      const inviteLink = await this.settings.get(SETTINGS_KEYS.CHANNEL_INVITE_LINK);
      const text = inviteLink
        ? `Siz allaqachon kursda ishtirok etayapsiz! 🎉\n\nKanalga link: ${inviteLink}`
        : 'Siz allaqachon kursda ishtirok etayapsiz! 🎉';
      await ctx.reply(text);
      return;
    }

    ctx.session.awaitingReceipt = false;

    // ──────── 5. AFTER_START_NO_PAYMENT auto-message ────────
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

    // ──────── 6. Welcome ────────
    await this.welcomeHandler.send(ctx);
  }

  // ──────── REFERRAL HANDLER ────────

  private async processReferral(
    ctx: BotContext,
    newUserId: string,
    referrerId: string,
  ): Promise<void> {
    const enabled = await this.settings.get(SETTINGS_KEYS.GAMIFICATION_ENABLED);
    if (enabled === 'false') return;

    const referrer = await this.referrals.acceptReferrer(newUserId, referrerId);
    if (!referrer) return;

    const amountStr = await this.settings.get(
      SETTINGS_KEYS.POINTS_PER_REFERRAL_START,
    );
    const amount = Number(amountStr || '10');

    const newUser = ctx.dbUser;
    const newUserName = newUser
      ? getFullName(newUser.firstName, newUser.lastName) ||
        (newUser.username ? '@' + newUser.username : `User ${newUser.id}`)
      : `User ${newUserId}`;

    const tx = await this.points.award({
      userId: referrer.id,
      amount,
      type: PointsTransactionType.REFERRAL_START,
      description: `Yangi referral: ${newUserName}`,
      relatedUserId: newUserId,
    });
    if (!tx) return;

    // Referrerga xabar (best-effort).
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
