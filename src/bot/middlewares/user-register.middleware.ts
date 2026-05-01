// Har bir update'dan oldin foydalanuvchini DB ga yozadi (yoki yangilaydi).
// Natijada ctx.dbUser handler'lar uchun mavjud bo'ladi.
// Faqat private chat'lardan kelgan update'larni qayd qiladi —
// admin guruh (callback'lar) yoki kanal update'larini emas.

import { Logger } from '@nestjs/common';
import type { NextFunction } from 'grammy';
import { UsersService } from '../../users/users.service';
import { BotContext } from '../bot.context';

const logger = new Logger('UserRegisterMiddleware');

export function buildUserRegisterMiddleware(usersService: UsersService) {
  return async function userRegisterMiddleware(
    ctx: BotContext,
    next: NextFunction,
  ): Promise<void> {
    const from = ctx.from;
    const chat = ctx.chat;

    // Bot/anonim user bo'lsa o'tkazib yuboramiz.
    if (!from || from.is_bot) {
      return next();
    }

    // Faqat private chat'da DB ga yozamiz. Guruh callback'larida ctx.dbUser kerak emas.
    if (chat?.type === 'private') {
      try {
        const { user, isNew } = await usersService.findOrCreate({
          telegramId: BigInt(from.id),
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
          languageCode: from.language_code ?? null,
        });
        ctx.dbUser = user;
        ctx.isNewUser = isNew;
      } catch (err) {
        logger.error(
          `findOrCreate failed for ${from.id}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }

    return next();
  };
}
