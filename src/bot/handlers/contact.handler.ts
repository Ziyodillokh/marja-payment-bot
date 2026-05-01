// Contact (telefon raqam) qabul qilish.
// - contact.user_id === message.from.id tekshiruvi
// - DB da phone saqlanadi, status = PHONE_PROVIDED
// - AFTER_PHONE_NO_PAYMENT auto-message'lar BullMQ'ga delayed yuboriladi
// - Welcome bo'limi yuboriladi

import { Injectable, Logger } from '@nestjs/common';
import { TriggerType } from '@prisma/client';
import { BotContext } from '../bot.context';
import { UsersService } from '../../users/users.service';
import { AutoMessagesService } from '../../auto-messages/auto-messages.service';
import { WelcomeHandler } from './welcome.handler';

@Injectable()
export class ContactHandler {
  private readonly logger = new Logger(ContactHandler.name);

  constructor(
    private readonly users: UsersService,
    private readonly autoMessages: AutoMessagesService,
    private readonly welcomeHandler: WelcomeHandler,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const user = ctx.dbUser;
    const contact = ctx.message?.contact;
    const fromId = ctx.from?.id;

    if (!user || !contact || !fromId) return;

    // Boshqa odamning kontaktini yubormasligi uchun.
    if (contact.user_id !== fromId) {
      await ctx.reply("Iltimos, faqat o'z raqamingizni yuboring.");
      return;
    }

    const phone = contact.phone_number.startsWith('+')
      ? contact.phone_number
      : `+${contact.phone_number}`;

    await this.users.updatePhone(user.id, phone);

    // Reply keyboard'ni olib tashlaymiz.
    await ctx.reply('Rahmat! Telefon raqamingiz qabul qilindi. ✅', {
      reply_markup: { remove_keyboard: true },
    });

    // AFTER_PHONE_NO_PAYMENT triggerli auto-message'larni rejalashtirmoq.
    try {
      await this.autoMessages.scheduleForUser(
        user.id,
        TriggerType.AFTER_PHONE_NO_PAYMENT,
      );
    } catch (err) {
      this.logger.error(
        `Failed to schedule AFTER_PHONE_NO_PAYMENT auto messages for user #${user.id}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    // Welcome bo'limi.
    await this.welcomeHandler.send(ctx);
  }
}
