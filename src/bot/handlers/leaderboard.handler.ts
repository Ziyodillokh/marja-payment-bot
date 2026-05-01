// /top, /leaderboard komandasi va "leaderboard" callback.

import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../bot.context';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { escapeHtml, formatPrice } from '../../common/utils/html.util';
import { getFullName } from '../../common/utils/name.util';

const MEDALS = ['🥇', '🥈', '🥉'];

@Injectable()
export class LeaderboardHandler {
  private readonly logger = new Logger(LeaderboardHandler.name);

  constructor(private readonly leaderboard: LeaderboardService) {}

  async handle(ctx: BotContext, fromCallback = false): Promise<void> {
    const user = ctx.dbUser;
    const top = await this.leaderboard.getTop(10);

    let text = `🏆 <b>TOP-10 Reyting</b>\n\n`;

    if (top.length === 0) {
      text += `<i>Hali bironta foydalanuvchi ball yig'magan.</i>`;
    } else {
      top.forEach((u, i) => {
        const medal = MEDALS[i] ?? `<b>${i + 1}.</b>`;
        const name = escapeHtml(
          getFullName(u.firstName, u.lastName) ||
            (u.username ? '@' + u.username : `User ${u.id}`),
        );
        text += `${medal} ${name} — <b>${formatPrice(u.points, '')}</b> ball\n`;
      });
    }

    if (user) {
      const userRank = await this.leaderboard.getUserRank(user.id);
      const inTop = top.some((u) => u.id === user.id);
      if (!inTop && userRank > 0) {
        text += `\n<i>...</i>\n`;
        text += `<b>#${userRank}</b>. <i>Siz</i> — <b>${formatPrice(user.points, '')}</b> ball`;
      } else if (!inTop && userRank === 0) {
        text += `\n<i>Siz hali ball yig'magansiz.</i>`;
      }
    }

    if (fromCallback && ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
      await ctx.reply(text, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML' });
    }
  }
}
