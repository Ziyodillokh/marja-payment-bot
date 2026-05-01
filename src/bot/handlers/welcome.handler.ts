// Welcome bo'limini yuboradigan helper handler.
// 1. welcome video (agar bor bo'lsa)
// 2. welcome text (HTML)
// 3. course price + "💳 To'lov qilish" inline tugma

import { Injectable, Logger } from '@nestjs/common';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { payInlineKeyboard } from '../keyboards/inline.keyboards';
import { formatPrice } from '../../common/utils/html.util';

@Injectable()
export class WelcomeHandler {
  private readonly logger = new Logger(WelcomeHandler.name);

  constructor(private readonly settings: SettingsService) {}

  async send(ctx: BotContext): Promise<void> {
    const [videoFileId, welcomeText, price] = await Promise.all([
      this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID),
      this.settings.get(SETTINGS_KEYS.WELCOME_TEXT),
      this.settings.get(SETTINGS_KEYS.COURSE_PRICE),
    ]);

    if (videoFileId) {
      try {
        await ctx.replyWithVideo(videoFileId);
      } catch (err) {
        this.logger.warn(
          `Failed to send welcome video (file_id may be invalid): ${(err as Error).message}`,
        );
      }
    }

    if (welcomeText) {
      await ctx.reply(welcomeText, { parse_mode: 'HTML' });
    }

    const priceText = price ? formatPrice(price) : '—';
    await ctx.reply(
      `Kurs narxi: <b>${priceText} so'm</b>\n\n` +
        "To'lov qilish uchun pastdagi tugmani bosing 👇",
      {
        parse_mode: 'HTML',
        reply_markup: payInlineKeyboard(),
      },
    );
  }
}
