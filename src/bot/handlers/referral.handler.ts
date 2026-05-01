// /referral komandasi va "referral" callback.
// Foydalanuvchi referral linkini va statistikasini ko'radi.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotContext } from '../bot.context';
import { ReferralsService } from '../../referrals/referrals.service';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { escapeHtml } from '../../common/utils/html.util';

@Injectable()
export class ReferralHandler {
  private readonly logger = new Logger(ReferralHandler.name);

  constructor(
    private readonly referrals: ReferralsService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  async handle(ctx: BotContext, fromCallback = false): Promise<void> {
    const user = ctx.dbUser;
    if (!user) return;

    const [stats, refStartPts, refPurchasePts] = await Promise.all([
      this.referrals.getStats(user.id),
      this.settings.get(SETTINGS_KEYS.POINTS_PER_REFERRAL_START),
      this.settings.get(SETTINGS_KEYS.POINTS_PER_REFERRAL_PURCHASE),
    ]);

    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';
    const link = this.referrals.buildReferralLink(botUsername, user.id);

    const text =
      `🔗 <b>Sizning referral linkingiz:</b>\n\n` +
      `<code>${escapeHtml(link)}</code>\n\n` +
      `📊 <b>Statistika:</b>\n` +
      `• Botga kirganlar: <b>${stats.totalReferrals}</b>\n` +
      `• Kurs sotib olganlar: <b>${stats.purchasedReferrals}</b>\n` +
      `• Jami ball topilgan: <b>${stats.totalEarnedPoints}</b>\n\n` +
      `💡 <b>Har bir do'st uchun:</b>\n` +
      `+${refStartPts || '10'} ball — start bossa\n` +
      `+${refPurchasePts || '50'} ball — kurs sotib olsa`;

    if (fromCallback && ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
    }
    await ctx.reply(text, { parse_mode: 'HTML' });
  }
}
