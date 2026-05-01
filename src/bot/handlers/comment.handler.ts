// Diskussiya guruhidagi izohlar uchun ball berish.
// Talablar:
//   - Bot diskussiya guruhida admin (yoki privacy mode disable)
//   - allowed_updates ga "message" qo'shilgan
//   - settings.discussion_group_id sozlangan
//
// Anti-spam:
//   - matn uzunligi >= min_comment_length
//   - kuniga max_comments_per_day dan oshmasin
//   - har bir (chat, message) bo'yicha unique log
//
// MUHIM: faqat botda ro'yxatdan o'tgan foydalanuvchilarga ball beriladi.
// Bu handler diskussiya guruhi xabarlarida user'ni avtomatik yaratmaydi.

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PointsTransactionType } from '@prisma/client';

import { BotContext } from '../bot.context';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService } from '../../points/points.service';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';

@Injectable()
export class CommentHandler {
  private readonly logger = new Logger(CommentHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * @returns true — handle qilindi, false — boshqa handlerga uzatish kerak
   */
  async handle(ctx: BotContext): Promise<boolean> {
    if (!(await this.isEnabled())) return false;

    const message = ctx.message;
    const chat = ctx.chat;
    const from = ctx.from;
    if (!message || !chat || !from || from.is_bot) return false;

    // Faqat diskussiya guruhi.
    const groupId = await this.settings.get(SETTINGS_KEYS.DISCUSSION_GROUP_ID);
    if (!groupId || String(chat.id) !== groupId) return false;

    // Faqat kanal postiga javob (izoh) bo'lsa.
    // Telegram'da `message_thread_id` discussion thread'ga ishora qiladi.
    if (!message.message_thread_id) return false;

    // sender_chat — kanal'dan forward yoki anonim guruh adminining xabari.
    if (message.sender_chat) return false;

    const text = message.text?.trim();
    if (!text) return false;

    // Minimum uzunlik.
    const minLen = Number(
      (await this.settings.get(SETTINGS_KEYS.MIN_COMMENT_LENGTH)) || '5',
    );
    if (text.length < minLen) return false;

    // Faqat botda ro'yxatdan o'tgan foydalanuvchi.
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(from.id) },
    });
    if (!user) return false;

    // Duplicate (bir xil xabar uchun) — har ehtimolga qarshi.
    const exists = await this.prisma.commentLog.findUnique({
      where: {
        chatId_messageId: {
          chatId: BigInt(chat.id),
          messageId: BigInt(message.message_id),
        },
      },
    });
    if (exists) return true;

    // Kuniga limit.
    const maxPerDay = Number(
      (await this.settings.get(SETTINGS_KEYS.MAX_COMMENTS_PER_DAY)) || '10',
    );
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.commentLog.count({
      where: { userId: user.id, createdAt: { gte: startOfDay } },
    });
    if (todayCount >= maxPerDay) {
      this.logger.debug(
        `User #${user.id} reached daily comment limit (${maxPerDay})`,
      );
      return true;
    }

    const pointsAmount = Number(
      (await this.settings.get(SETTINGS_KEYS.POINTS_PER_COMMENT)) || '10',
    );

    try {
      await this.points.award({
        userId: user.id,
        amount: pointsAmount,
        type: PointsTransactionType.COMMENT,
        description: `Izoh: "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`,
        relatedMessageId: BigInt(message.message_id),
      });

      await this.prisma.commentLog.create({
        data: {
          userId: user.id,
          chatId: BigInt(chat.id),
          messageId: BigInt(message.message_id),
          threadId: BigInt(message.message_thread_id),
          pointsAwarded: pointsAmount,
        },
      });
    } catch (err) {
      // Race condition — bir vaqtda ikki marta yaratish urinishi (P2002).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return true;
      }
      this.logger.error(
        `Failed to award comment points for user #${user.id}: ${(err as Error).message}`,
      );
    }

    return true;
  }

  private async isEnabled(): Promise<boolean> {
    const v = await this.settings.get(SETTINGS_KEYS.GAMIFICATION_ENABLED);
    return v !== 'false';
  }
}
