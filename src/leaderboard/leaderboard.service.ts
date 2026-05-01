// LeaderboardService — top va user rank.
// Hozircha real-time count(points > userPoints) bilan ishlaydi —
// ~10k user gacha qabul qilarli. Kattaroq DB uchun:
//   - Redis ZSET cache (5 daq TTL)
//   - PostgreSQL window function ROW_NUMBER + materialized view

import { Injectable } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LeaderboardUser = Pick<
  User,
  | 'id'
  | 'telegramId'
  | 'username'
  | 'firstName'
  | 'lastName'
  | 'points'
>;

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTop(limit = 10): Promise<LeaderboardUser[]> {
    return this.prisma.user.findMany({
      where: {
        points: { gt: 0 },
        status: { not: UserStatus.BLOCKED },
      },
      orderBy: [{ points: 'desc' }, { id: 'asc' }],
      take: Math.min(500, Math.max(1, limit)),
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        points: true,
      },
    });
  }

  /**
   * Foydalanuvchining 1-bazasidagi reytingi.
   * Tenglikda kichikroq id'li yuqori turadi (orderBy bilan mos).
   * @returns 1, 2, 3 ... yoki 0 (user topilmasa yoki bloklangan bo'lsa).
   */
  async getUserRank(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, points: true, status: true },
    });
    if (!user || user.status === UserStatus.BLOCKED || user.points <= 0) {
      return 0;
    }

    // points > user.points YOKI (points = user.points VA id < user.id)
    const higherCount = await this.prisma.user.count({
      where: {
        status: { not: UserStatus.BLOCKED },
        OR: [
          { points: { gt: user.points } },
          { points: user.points, id: { lt: user.id } },
        ],
      },
    });

    return higherCount + 1;
  }

  async getActivePlayersCount(): Promise<number> {
    return this.prisma.user.count({
      where: {
        points: { gt: 0 },
        status: { not: UserStatus.BLOCKED },
      },
    });
  }
}
