// Welcome bo'limini yuboradigan helper handler.
//
// Yangi yondashuv (UX yaxshilash):
// 1. Video YOKI VideoNote (dumaloq, settings.welcome_video_is_note bo'yicha)
// 2. Welcome text + price + inline button — BIR XABAR (alohida "Kurs narxi" yo'q)
//
// VideoNote talablari (Telegram):
//   - Square aspect ratio
//   - Max 60 sekund
//   - H.264 codec
//   Aks holda Telegram fail beradi va biz oddiy video sifatida fallback qilamiz.

import { Injectable, Logger } from '@nestjs/common';
import { GrammyError } from 'grammy';
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
    const [videoFileId, isNote, welcomeText, price] = await Promise.all([
      this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID),
      this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_IS_NOTE),
      this.settings.get(SETTINGS_KEYS.WELCOME_TEXT),
      this.settings.get(SETTINGS_KEYS.COURSE_PRICE),
    ]);

    // ──────── 1. Video / VideoNote ────────
    if (videoFileId) {
      const wantNote = isNote === 'true';
      try {
        if (wantNote) {
          await ctx.replyWithVideoNote(videoFileId);
        } else {
          await ctx.replyWithVideo(videoFileId);
        }
      } catch (err) {
        // VideoNote yuborib bo'lmasa (square emas, uzun, va h.k.) — oddiy video sifatida fallback.
        if (wantNote && err instanceof GrammyError) {
          this.logger.warn(
            `VideoNote yuborib bo'lmadi (${err.description}) — sendVideo bilan fallback`,
          );
          try {
            await ctx.replyWithVideo(videoFileId);
          } catch (fallbackErr) {
            this.logger.warn(
              `Video ham yuborib bo'lmadi: ${(fallbackErr as Error).message}`,
            );
          }
        } else {
          this.logger.warn(
            `Welcome video yuborib bo'lmadi: ${(err as Error).message}`,
          );
        }
      }
    }

    // ──────── 2. Welcome text + price + inline button — bir xabar ────────
    const priceText = price ? formatPrice(price) : '';
    let combinedText = welcomeText || '';

    // Agar admin matnida narx eslatilmagan bo'lsa, oxiriga qo'shamiz.
    // Aks holda — admin o'z matnida ko'rsatgan, hech nima qo'shmaymiz.
    if (priceText && combinedText && !combinedText.includes(priceText)) {
      combinedText += `\n\n💰 <b>Kurs narxi:</b> ${priceText} so'm`;
    }

    // Agar matn umuman bo'lmasa, default minimal matn ishlatamiz.
    if (!combinedText) {
      combinedText = priceText
        ? `💰 <b>Kurs narxi:</b> ${priceText} so'm\n\nTo'lov qilish uchun pastdagi tugmani bosing 👇`
        : `To'lov qilish uchun pastdagi tugmani bosing 👇`;
    }

    await ctx.reply(combinedText, {
      parse_mode: 'HTML',
      reply_markup: payInlineKeyboard(),
    });
  }
}
