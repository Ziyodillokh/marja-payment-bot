// Welcome bo'limini yuboradigan helper handler.
//
// Tartibda yuboriladi:
// 1. Media — agar mavjud bo'lsa: photo, video yoki videoNote (dumaloq).
// 2. Welcome text + price + inline button — BIR XABAR.
//
// Media turi `welcome_media_type` setting'idan o'qiladi ('photo' | 'video' | '').
// Eski yozuvlar uchun (mediaType bo'sh, file_id bor) — video deb tahmin qilinadi.
//
// VideoNote talablari (Telegram):
//   - Square aspect ratio, max 60 sekund, H.264 codec
//   Aks holda Telegram fail beradi va biz oddiy video sifatida fallback qilamiz.

import { Injectable, Logger } from '@nestjs/common';
import { GrammyError } from 'grammy';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { payInlineKeyboard } from '../keyboards/inline.keyboards';
import { formatPrice } from '../../common/utils/html.util';
import { renderTemplate } from '../../common/utils/template.util';

@Injectable()
export class WelcomeHandler {
  private readonly logger = new Logger(WelcomeHandler.name);

  constructor(private readonly settings: SettingsService) {}

  async send(ctx: BotContext): Promise<void> {
    const [mediaFileId, mediaType, isNote, welcomeText, price] =
      await Promise.all([
        this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_FILE_ID),
        this.settings.get(SETTINGS_KEYS.WELCOME_MEDIA_TYPE),
        this.settings.get(SETTINGS_KEYS.WELCOME_VIDEO_IS_NOTE),
        this.settings.get(SETTINGS_KEYS.WELCOME_TEXT),
        this.settings.get(SETTINGS_KEYS.COURSE_PRICE),
      ]);

    // ──────── 1. Media (photo / video / videoNote) ────────
    // Eski yozuvlar uchun fallback: mediaType bo'sh bo'lsa va file_id bor bo'lsa,
    // video deb tahmin qilamiz (avval faqat video qo'llab-quvvatlanardi).
    const effectiveType = mediaType || (mediaFileId ? 'video' : '');

    if (mediaFileId && effectiveType === 'photo') {
      try {
        await ctx.replyWithPhoto(mediaFileId);
      } catch (err) {
        this.logger.warn(
          `Welcome photo yuborib bo'lmadi: ${(err as Error).message}`,
        );
      }
    } else if (mediaFileId && effectiveType === 'video') {
      const wantNote = isNote === 'true';
      try {
        if (wantNote) {
          await ctx.replyWithVideoNote(mediaFileId);
        } else {
          await ctx.replyWithVideo(mediaFileId);
        }
      } catch (err) {
        if (wantNote && err instanceof GrammyError) {
          this.logger.warn(
            `VideoNote yuborib bo'lmadi (${err.description}) — sendVideo fallback`,
          );
          try {
            await ctx.replyWithVideo(mediaFileId);
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

    // Template variable substitution — {firstname}, {lastname}, {fullname}, {username}
    if (ctx.from) {
      combinedText = renderTemplate(
        combinedText,
        {
          firstName: ctx.from.first_name ?? null,
          lastName: ctx.from.last_name ?? null,
          username: ctx.from.username ?? null,
        },
        { escapeHtml: true },
      );
    }

    await ctx.reply(combinedText, {
      parse_mode: 'HTML',
      reply_markup: payInlineKeyboard(),
    });
  }
}
