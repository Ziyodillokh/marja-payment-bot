// PointsService — markaziy ball boshqaruv API.
// Har bir o'zgarish DB transaction ichida: PointsTransaction yozuvi + User.points increment.
//
// Idempotency:
//   REFERRAL_PURCHASE uchun (userId, type, relatedUserId) bo'yicha unique constraint
//   schema.prisma da o'rnatilgan. Qayta urinishda P2002 catch qilamiz.

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PointsTransaction, PointsTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AwardPointsInput } from './dto/award-points.dto';

export interface PointsHistoryFilter {
  userId?: number;
  type?: PointsTransactionType;
  page?: number;
  limit?: number;
}

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ball berish/olish (musbat yoki manfiy amount).
   * Atomik: transaction yozuvi + user.points yangilanishi bir transaction ichida.
   * REFERRAL_PURCHASE uchun unique constraint orqali idempotent.
   *
   * @returns yaratilgan PointsTransaction yoki null (allaqachon mavjud bo'lsa).
   */
  async award(input: AwardPointsInput): Promise<PointsTransaction | null> {
    if (input.amount === 0) return null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.pointsTransaction.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            type: input.type,
            description: input.description ?? null,
            relatedUserId: input.relatedUserId ?? null,
            relatedMessageId: input.relatedMessageId ?? null,
          },
        });

        await tx.user.update({
          where: { id: input.userId },
          data: { points: { increment: input.amount } },
        });

        return transaction;
      });
    } catch (err) {
      // P2002 — unique constraint (REFERRAL_PURCHASE qayta berilmoqchi).
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.debug(
          `Idempotent skip: user=${input.userId} type=${input.type} ref=${input.relatedUserId}`,
        );
        return null;
      }
      throw err;
    }
  }

  // ──────────────── HISTORY / LIST ────────────────

  async listHistory(filter: PointsHistoryFilter): Promise<{
    items: PointsTransaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

    const where: Prisma.PointsTransactionWhereInput = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.type) where.type = filter.type;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pointsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pointsTransaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ──────────────── STATS ────────────────

  async stats(from?: Date, to?: Date): Promise<{
    totalAwarded: number;
    totalDeducted: number;
    countByType: Record<PointsTransactionType, number>;
    sumByType: Record<PointsTransactionType, number>;
  }> {
    const where: Prisma.PointsTransactionWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const grouped = await this.prisma.pointsTransaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    const allTypes = Object.values(PointsTransactionType);
    const countByType = Object.fromEntries(
      allTypes.map((t) => [t, 0]),
    ) as Record<PointsTransactionType, number>;
    const sumByType = Object.fromEntries(
      allTypes.map((t) => [t, 0]),
    ) as Record<PointsTransactionType, number>;

    let totalAwarded = 0;
    let totalDeducted = 0;

    for (const g of grouped) {
      const sum = g._sum.amount ?? 0;
      countByType[g.type] = g._count._all;
      sumByType[g.type] = sum;
      if (sum > 0) totalAwarded += sum;
      else totalDeducted += sum;
    }

    return { totalAwarded, totalDeducted, countByType, sumByType };
  }
}
