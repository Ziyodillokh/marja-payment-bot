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

interface SendOnePayload {
  broadcastId: number;
  userId: number;
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
      await this.handleStart(job.data.broadcastId as number);
      return;
    }
    if (job.name === BROADCAST_JOBS.SEND_ONE) {
      await this.handleSendOne(job.data as SendOnePayload);
      return;
    }
  }

  private async handleStart(broadcastId: number): Promise<void> {
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
          jobId: `bc:${broadcastId}:u:${userId}`,
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
      await this.send(user.telegramId, broadcast);
      await this.service.incrementSent(broadcastId);
    } catch (err) {
      if (err instanceof GrammyError) {
        if (err.error_code === 403) {
          await this.users.markBlocked(userId);
          this.logger.warn(`User #${userId} blocked — marked BLOCKED`);
        }
      }
      await this.service.incrementFailed(broadcastId);
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

  private async send(
    telegramId: bigint,
    broadcast: Broadcast,
  ): Promise<void> {
    const chatId = telegramId.toString();
    const api = this.botService.bot.api;
    const parseMode = broadcast.parseMode ?? 'HTML';

    if (!broadcast.mediaFileId) {
      await api.sendMessage(chatId, broadcast.text, {
        parse_mode: parseMode as 'HTML' | 'MarkdownV2',
      });
      return;
    }

    const opts = {
      caption: broadcast.text,
      parse_mode: parseMode as 'HTML' | 'MarkdownV2',
    };

    switch (broadcast.mediaType) {
      case 'photo':
        await api.sendPhoto(chatId, broadcast.mediaFileId, opts);
        break;
      case 'video':
        await api.sendVideo(chatId, broadcast.mediaFileId, opts);
        break;
      case 'document':
        await api.sendDocument(chatId, broadcast.mediaFileId, opts);
        break;
      case 'audio':
        await api.sendAudio(chatId, broadcast.mediaFileId, opts);
        break;
      default:
        await api.sendMessage(chatId, broadcast.text, {
          parse_mode: parseMode as 'HTML' | 'MarkdownV2',
        });
    }
  }
}
