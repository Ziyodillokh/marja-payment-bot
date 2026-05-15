// Chek (rasm) qabul qilish.
// session.awaitingReceipt = true bo'lsa ishlaydi.
// 1. Eng katta photo variantining file_id ni oladi.
// 2. Payment yaratadi (status PENDING) → user status PAYMENT_PENDING ga o'tadi.
// 3. Admin guruhga chek + tasdiqlash tugmalari yuboradi.
// 4. User'ga tasdiq xabarini qaytaradi.

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TriggerType } from '@prisma/client';
import { BotContext } from '../bot.context';
import { PaymentsService } from '../../payments/payments.service';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { reviewInlineKeyboard } from '../keyboards/inline.keyboards';
import {
  escapeHtml,
  formatDateTime,
  formatPrice,
} from '../../common/utils/html.util';
import { BotService } from '../bot.service';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';

@Injectable()
export class ReceiptHandler {
  private readonly logger = new Logger(ReceiptHandler.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly settings: SettingsService,
    private readonly botService: BotService,
    private readonly autoMessages: AutoMessagesService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    const photos = ctx.message?.photo;

    if (!user || !photos || photos.length === 0) return;

    if (!ctx.session.awaitingReceipt) {
      // Foydalanuvchi shunchaki rasm yuborgan, chek deb qabul qilmaymiz.
      await ctx.reply(
        "To'lov chekini yuborish uchun avval <b>💳 To'lov qilish</b> tugmasini bosing.",
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Eng katta variantni oling.
    const largest = photos[photos.length - 1];
    const fileId = largest.file_id;

    const priceStr = await this.settings.get(SETTINGS_KEYS.COURSE_PRICE);
    const amount = priceStr || '0';

    let payment;
    try {
      payment = await this.payments.create({
        userId: user.id,
        amount: new Prisma.Decimal(amount),
        photoFileId: fileId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create payment for user #${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      await ctx.reply('Xatolik yuz berdi. Qayta urinib ko\'ring.');
      return;
    }

    ctx.session.awaitingReceipt = false;

    // Admin guruhga yuborish.
    const adminGroupIdStr = await this.settings.get(SETTINGS_KEYS.ADMIN_GROUP_ID);
    if (adminGroupIdStr) {
      try {
        const groupChatId = BigInt(adminGroupIdStr);
        const caption =
          `💰 <b>Yangi to'lov</b>\n\n` +
          `👤 Foydalanuvchi: ${escapeHtml(user.firstName ?? '')} ${escapeHtml(user.lastName ?? '')}\n` +
          `🆔 Telegram ID: <code>${user.telegramId.toString()}</code>\n` +
          `📛 Username: ${user.username ? '@' + escapeHtml(user.username) : '—'}\n` +
          `📞 Telefon: <code>${escapeHtml(user.phoneNumber ?? '—')}</code>\n` +
          `💵 Summa: ${formatPrice(amount)} so'm\n` +
          `🕐 Sana: ${formatDateTime(payment.createdAt)}\n` +
          `🔢 Payment ID: <code>${payment.id}</code>`;

        const sent = await this.botService.bot.api.sendPhoto(
          adminGroupIdStr,
          fileId,
          {
            caption,
            parse_mode: 'HTML',
            reply_markup: reviewInlineKeyboard(payment.id),
          },
        );

        await this.payments.setGroupMessage(
          payment.id,
          groupChatId,
          sent.message_id,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send payment to admin group: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    } else {
      this.logger.warn('admin_group_id setting is empty — cannot notify admins');
    }

    // User javob.
    await ctx.reply(
      `✅ <b>Chekingiz qabul qilindi!</b>\n\n` +
        `To'lovingiz tekshirilmoqda. Tez orada adminlarimiz tasdiqlab, ` +
        `sizni yopiq kanalga qo'shishadi.\n\n` +
        `Iltimos, kuting... 🕐`,
      { parse_mode: 'HTML' },
    );

    // AFTER_PAYMENT_NO_APPROVAL triggerli auto-message'larni darhol enqueue qilamiz.
    // Aks holda 60-sekundlik scheduler tick'ini kutishga tushadi (kechikish).
    try {
      await this.autoMessages.scheduleForUser(
        user.id,
        TriggerType.AFTER_PAYMENT_NO_APPROVAL,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to schedule AFTER_PAYMENT_NO_APPROVAL for user #${user.id}: ${(err as Error).message}`,
      );
    }
  }
}
