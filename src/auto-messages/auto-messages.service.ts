// AutoMessagesService — cron-style auto xabarlarni boshqaradi.
// - CRUD (admin panel uchun).
// - scheduleForUser: trigger paytida ishga tushadi (masalan, contact handler chaqiradi),
//   shu trigger turidagi barcha auto-message'larni BullMQ delayed job sifatida qo'yadi.
// - Processor (auto-messages.processor) job ishga tushganda current statusni tekshirib yuboradi.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AutoMessage, TriggerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAutoMessageDto,
  UpdateAutoMessageDto,
} from './dto/auto-message.dto';
import {
  AUTO_MESSAGE_JOBS,
  QUEUE_NAMES,
} from '../common/enums/queue-names.enum';

export interface AutoMessageJobPayload {
  autoMessageId: string;
  userId: string;
}

@Injectable()
export class AutoMessagesService {
  private readonly logger = new Logger(AutoMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AUTO_MESSAGE)
    private readonly queue: Queue<AutoMessageJobPayload>,
  ) {}

  // ──────────── CRUD ────────────

  async list(filter?: { from?: Date; to?: Date }): Promise<AutoMessage[]> {
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (filter?.from || filter?.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = filter.from;
      if (filter.to) where.createdAt.lte = filter.to;
    }
    return this.prisma.autoMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string): Promise<AutoMessage> {
    const m = await this.prisma.autoMessage.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`AutoMessage #${id} not found`);
    return m;
  }

  async create(dto: CreateAutoMessageDto): Promise<AutoMessage> {
    return this.prisma.autoMessage.create({
      data: {
        name: dto.name,
        triggerType: dto.triggerType,
        triggerAfter: dto.triggerAfter,
        text: dto.text,
        mediaFileId: dto.mediaFileId,
        mediaType: dto.mediaType,
        videoIsNote: dto.videoIsNote ?? false,
        payButton: dto.payButton ?? false,
        customButtons: (dto.customButtons ?? []) as object,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAutoMessageDto): Promise<AutoMessage> {
    await this.getById(id);
    const { customButtons, ...rest } = dto;
    return this.prisma.autoMessage.update({
      where: { id },
      data: {
        ...rest,
        ...(customButtons !== undefined
          ? { customButtons: customButtons as object }
          : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await this.prisma.autoMessage.delete({ where: { id } });
    // Pending jobs processor'da isActive tekshiruvi orqali skip bo'ladi.
  }

  // ──────────── BOT FLOW ────────────

  /**
   * User belgilangan triggerga yetdi → shu turdagi barcha aktiv auto-message'larni
   * delayed job sifatida queue'ga qo'yadi. Job ID = `am:{autoMessageId}:{userId}` —
   * dublikat trigger kelganda eski job overwrite bo'ladi.
   */
  async scheduleForUser(
    userId: string,
    triggerType: TriggerType,
  ): Promise<void> {
    const messages = await this.prisma.autoMessage.findMany({
      where: { triggerType, isActive: true },
    });

    for (const m of messages) {
      const jobId = `am_${m.id}_u_${userId}`;
      try {
        await this.queue.add(
          AUTO_MESSAGE_JOBS.SEND,
          { autoMessageId: m.id, userId },
          {
            jobId,
            delay: m.triggerAfter * 1000,
          },
        );
      } catch (err) {
        // Duplicate job xato emas — BullMQ jobId shu bo'lsa qaytarib qo'shmaydi.
        this.logger.debug(
          `enqueue auto-message ${m.id} for user ${userId} skipped: ${(err as Error).message}`,
        );
      }
    }
  }

  // ──────────── PROCESSOR ICHIDA ISHLATISH ────────────

  async hasBeenSent(autoMessageId: string, userId: string): Promise<boolean> {
    const log = await this.prisma.autoMessageLog.findUnique({
      where: { autoMessageId_userId: { autoMessageId, userId } },
    });
    return !!log;
  }

  async logSent(autoMessageId: string, userId: string): Promise<void> {
    await this.prisma.autoMessageLog.create({
      data: { autoMessageId, userId },
    });
  }
}
