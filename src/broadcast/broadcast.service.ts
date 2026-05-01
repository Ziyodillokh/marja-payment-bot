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
  broadcastId: number;
}

export interface BroadcastSendOneJob {
  broadcastId: number;
  userId: number;
}

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

  async getById(id: number): Promise<Broadcast> {
    const b = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!b) throw new NotFoundException(`Broadcast #${id} not found`);
    return b;
  }

  async create(dto: CreateBroadcastDto, createdById?: number): Promise<Broadcast> {
    let userIds: number[];
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
      { delay, jobId: `bc:${broadcast.id}` },
    );

    return broadcast;
  }

  async cancel(id: number): Promise<Broadcast> {
    const b = await this.getById(id);
    if (b.status !== BroadcastStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel broadcast in status ${b.status}`,
      );
    }
    await this.queue.remove(`bc:${id}`).catch(() => undefined);
    return this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.CANCELLED },
    });
  }

  // ──────────── Processor ichida ishlatiladi ────────────

  async markStarted(id: number): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.SENDING, startedAt: new Date() },
    });
  }

  async incrementSent(id: number): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { sentCount: { increment: 1 } },
    });
  }

  async incrementFailed(id: number): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { failedCount: { increment: 1 } },
    });
  }

  async markCompleted(id: number): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.COMPLETED, completedAt: new Date() },
    });
  }

  async markFailed(id: number): Promise<void> {
    await this.prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.FAILED, completedAt: new Date() },
    });
  }
}
