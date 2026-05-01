// ReferralsService — referral tizimi.
// - Referral kodi ↔ user.id konversiyasi (oddiy ref_{id} format)
// - Referrer'ni qabul qilish / o'rnatish
// - Statistika: kim necha kishini jalb qilgan, qanchasi sotib olgan
//
// Anti-fraud:
//   * o'z-o'ziga referral qilib bo'lmaydi
//   * mavjud user qayta /start bossa, ref e'tiborsiz qoladi
//   * referrer DB'da mavjud bo'lishi shart

import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReferralStats {
  totalReferrals: number;
  purchasedReferrals: number;
  totalEarnedPoints: number;
}

export interface TopReferrer {
  userId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  referralCount: number;
  pointsEarned: number;
}

const REF_PREFIX = 'ref_';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────── KOD KONVERSIYASI ────────────────

  buildReferralLink(botUsername: string, userId: number): string {
    return `https://t.me/${botUsername}?start=${REF_PREFIX}${userId}`;
  }

  /**
   * /start payload (`ref_123`) dan referrer userId ni ajratib oladi.
   * Noto'g'ri format yoki referral bo'lmasa null.
   */
  parseReferralCode(payload: string | undefined | null): number | null {
    if (!payload || !payload.startsWith(REF_PREFIX)) return null;
    const rest = payload.slice(REF_PREFIX.length);
    const id = Number(rest);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
  }

  // ──────────────── REFERRER'NI O'RNATISH ────────────────

  /**
   * Yangi user uchun referrer'ni qabul qiladi.
   * - referrer mavjudmi
   * - referrer != user (o'z-o'ziga referral mumkin emas)
   * - user da referredById hali yo'qligi
   *
   * @returns referrer User obyekti (muvaffaqiyatli o'rnatilgan bo'lsa) yoki null
   */
  async acceptReferrer(
    userId: number,
    referrerId: number,
  ): Promise<User | null> {
    if (userId === referrerId) {
      this.logger.warn(`Self-referral attempt: user=${userId}`);
      return null;
    }

    const [user, referrer] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: referrerId } }),
    ]);

    if (!user || !referrer) return null;

    // Yana bir himoya: telegramId ham bir xil bo'lmasin (multi-account fraud).
    if (user.telegramId === referrer.telegramId) {
      this.logger.warn(
        `Self-referral by telegramId: ${user.telegramId} → ${referrer.telegramId}`,
      );
      return null;
    }

    // Allaqachon referrerga ega — o'zgartirmaymiz.
    if (user.referredById) return null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { referredById: referrerId },
    });

    return referrer;
  }

  // ──────────────── STATISTIKA ────────────────

  async getReferralCount(userId: number): Promise<number> {
    return this.prisma.user.count({
      where: { referredById: userId },
    });
  }

  async getStats(userId: number): Promise<ReferralStats> {
    const [totalReferrals, purchasedReferrals, earnedAgg] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.user.count({
        where: { referredById: userId, status: UserStatus.APPROVED },
      }),
      this.prisma.pointsTransaction.aggregate({
        where: {
          userId,
          type: {
            in: [
              PointsTransactionType.REFERRAL_START,
              PointsTransactionType.REFERRAL_PURCHASE,
            ],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalReferrals,
      purchasedReferrals,
      totalEarnedPoints: earnedAgg._sum.amount ?? 0,
    };
  }

  async listReferralsOf(userId: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ──────────────── ADMIN PANEL ────────────────

  async getTopReferrers(limit = 20): Promise<TopReferrer[]> {
    // Bitta SQL bilan: jalb qilingan foydalanuvchilar soni va REFERRAL_*
    // tipidagi ball summasi.
    const rows = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        referralCount: bigint;
        pointsEarned: bigint;
      }>
    >`
      SELECT
        u.id              AS "userId",
        u.username        AS "username",
        u."firstName"     AS "firstName",
        u."lastName"      AS "lastName",
        COUNT(r.id)::bigint AS "referralCount",
        COALESCE(SUM(pt.amount), 0)::bigint AS "pointsEarned"
      FROM "User" u
      LEFT JOIN "User" r ON r."referredById" = u.id
      LEFT JOIN "PointsTransaction" pt
        ON pt."userId" = u.id
        AND pt.type IN ('REFERRAL_START', 'REFERRAL_PURCHASE')
      GROUP BY u.id
      HAVING COUNT(r.id) > 0
      ORDER BY "referralCount" DESC, "pointsEarned" DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      userId: r.userId,
      username: r.username,
      firstName: r.firstName,
      lastName: r.lastName,
      referralCount: Number(r.referralCount),
      pointsEarned: Number(r.pointsEarned),
    }));
  }
}
