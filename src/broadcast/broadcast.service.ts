// BroadcastService — mass message yaratish va boshqarish.
// Yaratilganda:
// 1. Filter bo'yicha targetUserIds hisoblanadi.
// 2. DB ga Broadcast yoziladi (totalCount = N).
// 3. Queue'ga BROADCAST_JOBS.START job qo'yiladi (scheduledAt bo'lsa delayed).

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Broadcast, BroadcastFilter, BroadcastStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';
import {
  BROADCAST_JOBS,
  QUEUE_NAMES,
} from '../common/enums/queue-names.enum';

export interface BroadcastStartJob {
  broadcastId: string;
}

export interface BroadcastSendOneJob {
  broadcastId: string;
  userId: string;
}
//
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    @InjectQueue(QUEUE_NAMES.BROADCAST)
    private readonly queue: Queue,
  ) {}

  async list(): Promise<Broadcast[]> {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getById(id: string): Promise<Broadcast> {
    const b = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Broadcast #${id} not found`);
    return b;
  }

  async getRecipientStats(broadcastId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    edited: number;
  }> {
    const grouped = await this.prisma.broadcastRecipient.groupBy({
      by: ['status'],
      where: { broadcastId },
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });
    let sent = 0,
      failed = 0,
      edited = 0,
      total = 0;
    for (const g of grouped) {
      const c = (g._count as { _all?: number } | undefined)?._all ?? 0;
      total += c;
      if (g.status === 'SENT') sent = c;
      else if (g.status === 'FAILED') failed = c;
      else if (g.status === 'EDITED') edited = c;
    }
    return { total, sent, failed, edited };
  }

  async create(dto: CreateBroadcastDto, createdById?: string): Promise<Broadcast> {
    let userIds: string[];
    if (dto.filterType === BroadcastFilter.SPECIFIC) {
      userIds = dto.userIds ?? [];
      if (userIds.length === 0) {
        throw new BadRequestException(
          'SPECIFIC filter requires non-empty userIds',
        );
      }
    } else {
      userIds = await this.users.findIdsByFilter(
        dto.filterType as 'ALL' | 'PAID' | 'UNPAID' | 'PENDING',
      );
    }

    const broadcast = await this.prisma.broadcast.create({
      data: {
        text: dto.text,
        mediaFileId: dto.mediaFileId,
        mediaType: dto.mediaType,
        parseMode: dto.parseMode ?? 'HTML',
        filterType: dto.filterType,
        userIds,
        totalCount: userIds.length,
        status: BroadcastStatus.PENDING,
        scheduledAt: dto.scheduledAt,
        createdById,
      },
    });

    const delay = dto.scheduledAt
      ? Math.max(0, dto.scheduledAt.getTime() - Date.now())
      : 0;

    await this.queue.add(
      BROADCAST_JOBS.START,
      { broadcastId: broadcast.id } satisfies BroadcastStartJob,
      { delay, jobId: `bc_${broadcast.id}` },
    );

    return broadcast;
  }

  /**
   * Mavjud broadcast'ni tahrirlash + yuborilgan barcha xabarlarni Telegram'da yangilash.
   * Telegram cheklovlari:
   *   - text edit: faqat 48 soat ichida
   *   - media bilan xabarda faqat caption edit qilinadi
   *   - rate limit: ~30 ms/sec
   */
  async editAndPropagate(
    id: string,
    input: { text?: string; mediaFileId?: string | null; mediaType?: string | null },
  ): Promise<Broadcast> {
    const before = await this.getById(id);

    // 1. DB'da yangilaymiz.
    const updated = await this.prisma.broadcast.update({
      where: { id },
      data: {
        text: input.text ?? before.text,
        mediaFileId: input.mediaFileId === undefined ? before.mediaFileId : input.mediaFileId,
        mediaType: input.mediaType === undefined ? before.mediaType : input.mediaType,
      },
    });

    // 2. Yuborilgan adresatlarga edit yuboramiz (background queue orqali).
    const recipients = await this.prisma.broadcastRecipient.findMany({
      where: { broadcastId: id, status: 'SENT', messageId: { not: null } },
    });

    let delay = 0;
    for (const r of recipients) {
      await this.queue.add(
        'edit-broadcast-message',
        { broadcastId: id, recipientId: r.id },
        {
          delay,
          jobId: `bc-edit_${id}_${r.id}_${Date.now()}`,
        },
      );
      delay += 50; // ~20 msg/sec
    }

    this.logger.log(
      `Broadcast #${id} edit dispatched to ${recipients.length} recipients`,
    );

    return updated;
  }

  async cancel(id: string): Promise<Broadcast> {
    const b = await this.getById(id);
    if (b.status !== BroadcastStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel broadcast in status ${b.status}`,
      );
    }
    await this.queue.remove(`bc_${id}`).catch(() => undefined);
    return this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.CANCELLED },
    });
  }

  // ──────────── Processor ichida ishlatiladi ────────────

  async markStarted(id: string): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.SENDING, startedAt: new Date() },
    });
  }

  async incrementSent(id: string): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { sentCount: { increment: 1 } },
    });
  }

  async incrementFailed(id: string): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { failedCount: { increment: 1 } },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async markFailed(id: string): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.FAILED, completedAt: new Date() },
    });
  }
}
