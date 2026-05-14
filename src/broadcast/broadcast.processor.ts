// Broadcast processor:
//
// "start-broadcast" job:
//    - Broadcast'ni o'qiydi.
//    - Status SENDING.
//    - Har bir userId uchun "send-broadcast-message" job qo'yadi (delay 50ms ga taqsimlangan).
//
// "send-broadcast-message" job:
//    - User Telegram ID bo'yicha xabarni yuboradi.
//    - 403 → user.status = BLOCKED, failedCount++.
//    - Boshqa GrammyError → failedCount++.
//    - Muvaffaqiyat → sentCount++.
//    - Oxirgi xabar bo'lsa Broadcast.status = COMPLETED.
//
// Telegram rate limit: 30 msg/sec (chat'lar bo'yicha jami). 50ms delay → ~20 msg/sec — xavfsiz.

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { GrammyError } from 'grammy';
import { Broadcast } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BotService } from '../bot/bot.service';
import { BroadcastService } from './broadcast.service';
import {
  BROADCAST_JOBS,
  QUEUE_NAMES,
} from '../common/enums/queue-names.enum';
import { buildInlineKeyboard } from '../common/utils/inline-buttons.util';
import { renderTemplate } from '../common/utils/template.util';

interface SendOnePayload {
  broadcastId: string;
  userId: string;
}

const PER_MESSAGE_DELAY_MS = 50; // ~20 msg/sec — Telegram rate limitidan past

@Processor(QUEUE_NAMES.BROADCAST, { concurrency: 5 })
export class BroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly botService: BotService,
    private readonly service: BroadcastService,
    @InjectQueue(QUEUE_NAMES.BROADCAST)
    private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === BROADCAST_JOBS.START) {
      await this.handleStart(job.data.broadcastId as string);
      return;
    }
    if (job.name === BROADCAST_JOBS.SEND_ONE) {
      await this.handleSendOne(job.data as SendOnePayload);
      return;
    }
    if (job.name === 'edit-broadcast-message') {
      await this.handleEditOne(
        job.data as { broadcastId: string; recipientId: string },
      );
      return;
    }
  }

  /**
   * Bitta adresatdagi yuborilgan xabarni tahrirlash.
   * - text: editMessageText
   * - media (caption): editMessageCaption
   */
  private async handleEditOne(payload: {
    broadcastId: string;
    recipientId: string;
  }): Promise<void> {
    const { broadcastId, recipientId } = payload;
    const [broadcast, recipient] = await Promise.all([
      this.prisma.broadcast.findUnique({ where: { id: broadcastId } }),
      this.prisma.broadcastRecipient.findUnique({ where: { id: recipientId } }),
    ]);
    if (!broadcast || !recipient || !recipient.messageId) return;

    const chatId = recipient.telegramId.toString();
    const api = this.botService.bot.api;
    const parseMode = (broadcast.parseMode ?? 'HTML') as 'HTML' | 'MarkdownV2';

    // Tahrirlanganda ham har bir foydalanuvchi uchun shaxsiylashtirilgan matn
    const recipientUser = await this.users.findById(recipient.userId);
    const text = recipientUser
      ? renderTemplate(broadcast.text, recipientUser, { escapeHtml: true })
      : broadcast.text;

    try {
      if (broadcast.mediaFileId) {
        await api.editMessageCaption(chatId, recipient.messageId, {
          caption: text,
          parse_mode: parseMode,
        });
      } else {
        await api.editMessageText(chatId, recipient.messageId, text, {
          parse_mode: parseMode,
        });
      }
      await this.prisma.broadcastRecipient.update({
        where: { id: recipientId },
        data: { status: 'EDITED', editedAt: new Date() },
      });
    } catch (err) {
      // Telegram "message is not modified" — bu xato emas, xuddi shu matn.
      const msg = (err as Error).message;
      if (msg.includes('message is not modified')) return;
      this.logger.warn(
        `editMessage failed for recipient #${recipientId}: ${msg}`,
      );
    }
  }

  private async handleStart(broadcastId: string): Promise<void> {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast) {
      this.logger.warn(`Broadcast #${broadcastId} not found — skip`);
      return;
    }
    if (broadcast.status === 'CANCELLED') {
      this.logger.log(`Broadcast #${broadcastId} cancelled — skip`);
      return;
    }
    if (broadcast.status !== 'PENDING') {
      this.logger.warn(
        `Broadcast #${broadcastId} status=${broadcast.status} — skip duplicate start`,
      );
      return;
    }

    await this.service.markStarted(broadcastId);

    const userIds = broadcast.userIds;
    if (userIds.length === 0) {
      await this.service.markCompleted(broadcastId);
      return;
    }

    let delay = 0;
    for (const userId of userIds) {
      await this.queue.add(
        BROADCAST_JOBS.SEND_ONE,
        { broadcastId, userId } satisfies SendOnePayload,
        {
          delay,
          jobId: `bc_${broadcastId}_u_${userId}`,
        },
      );
      delay += PER_MESSAGE_DELAY_MS;
    }

    this.logger.log(
      `Broadcast #${broadcastId} dispatched: ${userIds.length} users`,
    );
  }

  private async handleSendOne(payload: SendOnePayload): Promise<void> {
    const { broadcastId, userId } = payload;
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast) return;
    if (broadcast.status === 'CANCELLED') return;

    const user = await this.users.findById(userId);
    if (!user || user.status === 'BLOCKED') {
      await this.service.incrementFailed(broadcastId);
      await this.maybeComplete(broadcast);
      return;
    }

    try {
      // Template variable substitution — {firstname}/{lastname}/{fullname}/{username}
      const personalized = {
        ...broadcast,
        text: renderTemplate(broadcast.text, user, { escapeHtml: true }),
      };
      const messageId = await this.send(user.telegramId, personalized);
      await this.service.incrementSent(broadcastId);
      // Recipient log — keyinchalik edit qilishda kerak.
      await this.prisma.broadcastRecipient.upsert({
        where: { broadcastId_userId: { broadcastId, userId } },
        create: {
          broadcastId,
          userId,
          telegramId: user.telegramId,
          messageId,
          status: 'SENT',
          sentAt: new Date(),
        },
        update: { messageId, status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      let errorReason = (err as Error).message;
      if (err instanceof GrammyError) {
        if (err.error_code === 403) {
          await this.users.markBlocked(userId);
          this.logger.warn(`User #${userId} blocked — marked BLOCKED`);
        }
        errorReason = `${err.error_code}: ${err.description}`;
      }
      await this.service.incrementFailed(broadcastId);
      await this.prisma.broadcastRecipient.upsert({
        where: { broadcastId_userId: { broadcastId, userId } },
        create: {
          broadcastId,
          userId,
          telegramId: user.telegramId,
          status: 'FAILED',
          errorReason,
        },
        update: { status: 'FAILED', errorReason },
      });
    } finally {
      await this.maybeComplete(broadcast);
    }
  }

  private async maybeComplete(broadcast: Broadcast): Promise<void> {
    const fresh = await this.prisma.broadcast.findUnique({
      where: { id: broadcast.id },
    });
    if (!fresh) return;
    if (
      fresh.status === 'SENDING' &&
      fresh.sentCount + fresh.failedCount >= fresh.totalCount
    ) {
      await this.service.markCompleted(broadcast.id);
      this.logger.log(
        `Broadcast #${broadcast.id} completed: sent=${fresh.sentCount}, failed=${fresh.failedCount}`,
      );
    }
  }

  /** @returns Telegram message_id (edit uchun kerak — matn xabarida)  */
  private async send(
    telegramId: bigint,
    broadcast: Broadcast,
  ): Promise<number> {
    const chatId = telegramId.toString();
    const api = this.botService.bot.api;
    const parseMode = (broadcast.parseMode ?? 'HTML') as 'HTML' | 'MarkdownV2';
    const replyMarkup = buildInlineKeyboard(
      broadcast.payButton,
      broadcast.customButtons,
    );

    // VideoNote — caption/reply_markup yo'q. Avval videoNote, keyin matn (+keyboard) alohida.
    // edit uchun matn xabar message_id'ni saqlaymiz.
    if (
      broadcast.mediaFileId &&
      broadcast.mediaType === 'video' &&
      broadcast.videoIsNote
    ) {
      try {
        await api.sendVideoNote(chatId, broadcast.mediaFileId);
      } catch (err) {
        this.logger.warn(
          `sendVideoNote fail, fallback sendVideo: ${(err as Error).message}`,
        );
        await api.sendVideo(chatId, broadcast.mediaFileId);
      }
      const m = await api.sendMessage(chatId, broadcast.text, {
        parse_mode: parseMode,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      return m.message_id;
    }

    if (!broadcast.mediaFileId) {
      const m = await api.sendMessage(chatId, broadcast.text, {
        parse_mode: parseMode,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      return m.message_id;
    }

    const opts = {
      caption: broadcast.text,
      parse_mode: parseMode,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    let m;
    switch (broadcast.mediaType) {
      case 'photo':
        m = await api.sendPhoto(chatId, broadcast.mediaFileId, opts);
        break;
      case 'video':
        m = await api.sendVideo(chatId, broadcast.mediaFileId, opts);
        break;
      case 'document':
        m = await api.sendDocument(chatId, broadcast.mediaFileId, opts);
        break;
      case 'audio':
        m = await api.sendAudio(chatId, broadcast.mediaFileId, opts);
        break;
      default:
        m = await api.sendMessage(chatId, broadcast.text, {
          parse_mode: parseMode,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
    }
    return m.message_id;
  }
}
