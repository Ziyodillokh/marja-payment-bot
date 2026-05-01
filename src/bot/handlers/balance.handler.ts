// /balance, /points komandasi.
// Foydalanuvchining ball balansi, reytingi, referral linki va statistikasi.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InlineKeyboard } from 'grammy';

import { BotContext } from '../bot.context';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { escapeHtml, formatPrice } from '../../common/utils/html.util';

@Injectable()
export class BalanceHandler {
  private readonly logger = new Logger(BalanceHandler.name);

  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly referrals: ReferralsService,
    private readonly config: ConfigService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    if (!user) return;

    const [rank, refCount] = await Promise.all([
      this.leaderboard.getUserRank(user.id),
      this.referrals.getReferralCount(user.id),
    ]);

    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';
    const link = this.referrals.buildReferralLink(botUsername, user.id);

    const rankText = rank > 0 ? `#${rank}` : '—';

    const text =
      `💎 <b>Sizning balansingiz</b>\n\n` +
      `🏅 Ball: <b>${formatPrice(user.points, '')}</b>\n` +
      `📊 Reyting: <b>${rankText}</b>\n` +
      `👥 Referrallaringiz: <b>${refCount}</b>\n\n` +
      `🔗 <b>Referral linkingiz:</b>\n` +
      `<code>${escapeHtml(link)}</code>\n\n` +
      `Do'stlaringizni jalb qiling va ball yig'ing! 🚀`;

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('🏆 TOP-10', 'leaderboard')
        .text('🔗 Referral', 'referral'),
    });
  }
}
