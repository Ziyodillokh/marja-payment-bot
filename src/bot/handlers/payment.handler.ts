// "💳 To'lov qilish" callback handler.
// - Karta ma'lumotlarini yuboradi.
// - paymentStartedAt ni yangilaydi.
// - session.awaitingReceipt = true → keyingi rasm chek deb qabul qilinadi.

import { Injectable, Logger } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { BotContext } from '../bot.context';
import { SettingsService } from '../../settings/settings.service';
import { UsersService } from '../../users/users.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';
import { formatPrice } from '../../common/utils/html.util';

@Injectable()
export class PaymentHandler {
  private readonly logger = new Logger(PaymentHandler.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly users: UsersService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    if (!user) return;

    // Allaqachon tasdiqlangan bo'lsa, qayta to'lashga ehtiyoj yo'q.
    if (user.status === UserStatus.APPROVED) {
      await ctx.answerCallbackQuery({
        text: 'Siz allaqachon kursga qo\'shilgansiz!',
      });
      return;
    }

    if (user.status === UserStatus.PAYMENT_PENDING) {
      await ctx.answerCallbackQuery({
        text: "To'lovingiz hali tekshirilmoqda, kuting...",
      });
      return;
    }

    if (!user.phoneNumber) {
      await ctx.answerCallbackQuery({
        text: 'Avval telefon raqamingizni yuboring.',
      });
      return;
    }

    const [cardNumber, cardHolder, price] = await Promise.all([
      this.settings.get(SETTINGS_KEYS.CARD_NUMBER),
      this.settings.get(SETTINGS_KEYS.CARD_HOLDER),
      this.settings.get(SETTINGS_KEYS.COURSE_PRICE),
    ]);

    const priceText = price ? formatPrice(price) : '—';

    const text =
      `💳 <b>To'lov ma'lumotlari</b>\n\n` +
      `Karta raqami: <code>${cardNumber || '—'}</code>\n` +
      `Karta egasi: ${cardHolder || '—'}\n` +
      `To'lov summasi: <b>${priceText} so'm</b>\n\n` +
      `⚠️ Yuqoridagi karta raqamiga <b>${priceText} so'm</b> summa o'tkazing va to'lov chekini ` +
      `RASM shaklida shu botga yuboring.`;

    await ctx.answerCallbackQuery();
    await ctx.reply(text, { parse_mode: 'HTML' });

    await this.users.markPaymentStarted(user.id);
    ctx.session.awaitingReceipt = true;
  }
}
