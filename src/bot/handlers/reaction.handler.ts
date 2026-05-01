// Diskussiya guruhidagi reaksiyalar uchun ball.
//
// Strategiya: OPTION 1 (qattiq) — har bir (user, message) juftligiga
// umrida 1 marta ball beriladi. Olib qo'yilsa qaytarilmaydi (ya'ni
// "olib qo'yilgan ball"ni yo'qotadi), qayta bossa qaytadan ball berilmaydi.
//
// Texnik:
//   - allowed_updates'ga 'message_reaction' qo'shilgan bo'lishi shart
//   - bot diskussiya guruhi admin (yoki private chat'da reaksiya)
//   - reaction.user kelishi uchun guruh public bo'lishi yoki user
//     reaction'ni mahfiy ko'rsatish opsiyasini yoqmagan bo'lishi kerak

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PointsTransactionType } from '@prisma/client';

import { BotContext } from '../bot.context';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService } from '../../points/points.service';
import { SettingsService } from '../../settings/settings.service';
import { SETTINGS_KEYS } from '../../common/enums/settings-keys.enum';

@Injectable()
export class ReactionHandler {
  private readonly logger = new Logger(ReactionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly points: PointsService,
    private readonly settings: SettingsService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    if (!(await this.isEnabled())) return;

    const reaction = ctx.messageReaction;
    if (!reaction) return;

    // Faqat diskussiya guruhi.
    const groupId = await this.settings.get(SETTINGS_KEYS.DISCUSSION_GROUP_ID);
    if (!groupId || String(reaction.chat.id) !== groupId) return;

    // Anonim/kanal reaksiyalari bizga kerak emas — faqat real user.
    if (!reaction.user) return;

    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(reaction.user.id) },
    });
    if (!user) return;

    const oldReactions = reaction.old_reaction;
    const newReactions = reaction.new_reaction;
    const hadReaction = oldReactions.length > 0;
    const hasReaction = newReactions.length > 0;

    if (!hadReaction && !hasReaction) return;
    if (hadReaction && hasReaction) {
      // O'zgartirish (👍 → ❤️) — ball o'zgarmaydi, faqat emoji'ni yangilaymiz.
      await this.updateEmoji(user.id, reaction.chat.id, reaction.message_id, newReactions[0]);
      return;
    }

    if (!hadReaction && hasReaction) {
      await this.handleAdded(
        user.id,
        reaction.chat.id,
        reaction.message_id,
        firstEmoji(newReactions),
      );
    } else {
      await this.handleRemoved(user.id, reaction.chat.id, reaction.message_id);
    }
  }

  // ──────────────── HELPERS ────────────────

  private async handleAdded(
    userId: number,
    chatId: number,
    messageId: number,
    emoji: string,
  ): Promise<void> {
    const log = await this.findLog(userId, chatId, messageId);

    // OPTION 1: agar avval allaqachon ball berilgan bo'lsa, qayta berilmaydi.
    if (log) {
      await this.prisma.reactionLog.update({
        where: { id: log.id },
        data: { isActive: true, emoji },
      });
      return;
    }

    const amount = Number(
      (await this.settings.get(SETTINGS_KEYS.POINTS_PER_REACTION)) || '10',
    );

    try {
      await this.points.award({
        userId,
        amount,
        type: PointsTransactionType.REACTION,
        description: `Reaksiya: ${emoji}`,
        relatedMessageId: BigInt(messageId),
      });

      await this.prisma.reactionLog.create({
        data: {
          userId,
          chatId: BigInt(chatId),
          messageId: BigInt(messageId),
          emoji,
          isActive: true,
          pointsAwarded: amount,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      this.logger.error(
        `Failed to award reaction points for user #${userId}: ${(err as Error).message}`,
      );
    }
  }

  private async handleRemoved(
    userId: number,
    chatId: number,
    messageId: number,
  ): Promise<void> {
    const log = await this.findLog(userId, chatId, messageId);
    if (!log) return;
    if (!log.isActive) return; // allaqachon olib qo'yilgan

    // OPTION 1: faqat isActive bayrog'ini false qilamiz, ballni qaytarib OLMAYMIZ.
    // Bu antifraud: user toggle qilib spam qila olmaydi.
    await this.prisma.reactionLog.update({
      where: { id: log.id },
      data: { isActive: false },
    });
  }

  private async updateEmoji(
    userId: number,
    chatId: number,
    messageId: number,
    newEmoji: string,
  ): Promise<void> {
    const log = await this.findLog(userId, chatId, messageId);
    if (!log) return;
    await this.prisma.reactionLog.update({
      where: { id: log.id },
      data: { emoji: newEmoji, isActive: true },
    });
  }

  private async findLog(userId: number, chatId: number, messageId: number) {
    return this.prisma.reactionLog.findUnique({
      where: {
        userId_chatId_messageId: {
          userId,
          chatId: BigInt(chatId),
          messageId: BigInt(messageId),
        },
      },
    });
  }

  private async isEnabled(): Promise<boolean> {
    const v = await this.settings.get(SETTINGS_KEYS.GAMIFICATION_ENABLED);
    return v !== 'false';
  }
}

// grammY MessageReactionUpdated.new_reaction — ReactionType[] (emoji yoki custom_emoji).
function firstEmoji(reactions: ReadonlyArray<{ type: string; emoji?: string }>): string {
  const r = reactions[0];
  if (!r) return '?';
  if (r.type === 'emoji' && r.emoji) return r.emoji;
  return r.type;
}
