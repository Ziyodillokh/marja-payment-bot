// UtmAnalyticsService — har UTM source bo'yicha funnel statistikasi.
//
// Funnel bosqichlari:
//   1. /start bosgan         (totalUsers)
//   2. Telefon bergan        (phoneProvided)         — phoneNumber !== null
//   3. To'lov boshlagan      (paymentInitiated)      — paymentStartedAt !== null
//   4. Chek yuborgan         (paymentSubmitted)      — payments.length > 0
//   5. Tasdiqlangan          (paymentApproved)       — status === APPROVED
//   6. Rad etilgan           (paymentRejected)       — status === REJECTED
//
// Konversiya foizlari hammasi /totalUsers ga nisbatan (overall, oxirgi rate
// approval rate).
//
// "Direct" — utmSourceId NULL bo'lgan userlar (manbasiz, eski yoki link'siz).

import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus, UtmSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FunnelMetrics {
  utmSourceId: string | null;
  code: string;
  name: string;

  totalUsers: number;
  phoneProvided: number;
  paymentInitiated: number;
  paymentSubmitted: number;
  paymentApproved: number;
  paymentRejected: number;

  // Konversiyalar (% totalUsers ga nisbatan)
  phoneRate: number;
  paymentInitRate: number;
  paymentSubmitRate: number;
  approvalRate: number;

  // Daromad
  revenue: string;        // Decimal serialized
  avgRevenuePerUser: string;
}

export interface DailyMetric {
  day: string;
  users: number;
  phone_provided?: number;
  approved: number;
  source_code?: string;
}

export interface FunnelFilter {
  from?: Date;
  to?: Date;
  utmSourceId?: string | null;
}

@Injectable()
export class UtmAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFunnelByUtmSource(filter: FunnelFilter): Promise<FunnelMetrics[]> {
    const sources = await this.prisma.utmSource.findMany({
      where: filter.utmSourceId ? { id: filter.utmSourceId } : {},
      orderBy: { createdAt: 'desc' },
    });

    // "Direct" (utmSourceId = null) ham qo'shiladi (filter spetsifik
    // source uchun bo'lmasa).
    const allSourceIds: Array<string | null> = sources.map((s) => s.id);
    if (filter.utmSourceId === undefined) allSourceIds.push(null);

    const results: FunnelMetrics[] = [];

    for (const sid of allSourceIds) {
      const metrics = await this.computeForSource(sid, filter, sources);
      results.push(metrics);
    }

    return results.sort((a, b) => b.totalUsers - a.totalUsers);
  }

  // ──────────── Internal: bitta source uchun ────────────

  private async computeForSource(
    utmSourceId: string | null,
    filter: FunnelFilter,
    sources: UtmSource[],
  ): Promise<FunnelMetrics> {
    const baseWhere: Prisma.UserWhereInput = { utmSourceId };
    if (filter.from || filter.to) {
      baseWhere.createdAt = {};
      if (filter.from) baseWhere.createdAt.gte = filter.from;
      if (filter.to) baseWhere.createdAt.lte = filter.to;
    }

    const [
      totalUsers,
      phoneProvided,
      paymentInitiated,
      paymentSubmitted,
      paymentApproved,
      paymentRejected,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({
        where: { ...baseWhere, phoneNumber: { not: null } },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, paymentStartedAt: { not: null } },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, payments: { some: {} } },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, status: UserStatus.APPROVED },
      }),
      this.prisma.user.count({
        where: { ...baseWhere, status: UserStatus.REJECTED },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'APPROVED',
          user: baseWhere,
        },
        _sum: { amount: true },
      }),
    ]);

    const revenueDec = revenueAgg._sum.amount ?? new Prisma.Decimal(0);
    const avgRev =
      totalUsers > 0
        ? revenueDec.dividedBy(totalUsers).toFixed(2)
        : '0';

    const sourceInfo = sources.find((s) => s.id === utmSourceId);

    return {
      utmSourceId,
      code: sourceInfo?.code ?? 'direct',
      name: sourceInfo?.name ?? "To'g'ridan-to'g'ri (manbasiz)",
      totalUsers,
      phoneProvided,
      paymentInitiated,
      paymentSubmitted,
      paymentApproved,
      paymentRejected,
      phoneRate: this.pct(phoneProvided, totalUsers),
      paymentInitRate: this.pct(paymentInitiated, totalUsers),
      paymentSubmitRate: this.pct(paymentSubmitted, totalUsers),
      approvalRate: this.pct(paymentApproved, totalUsers),
      revenue: revenueDec.toString(),
      avgRevenuePerUser: avgRev,
    };
  }

  // ──────────── Kunma-kun timeline (chart data) ────────────

  async getDaily(filter: {
    from: Date;
    to: Date;
    utmSourceId?: string | null;
  }): Promise<DailyMetric[]> {
    if (filter.utmSourceId !== undefined) {
      // Bitta source bo'yicha kunma-kun
      const rows = await this.prisma.$queryRaw<
        Array<{
          day: Date;
          users: number;
          phone_provided: number;
          approved: number;
        }>
      >`
        SELECT
          DATE("createdAt") as day,
          COUNT(*)::int as users,
          COUNT(*) FILTER (WHERE "phoneNumber" IS NOT NULL)::int as phone_provided,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::int as approved
        FROM "User"
        WHERE
          ${filter.utmSourceId === null ? Prisma.sql`"utmSourceId" IS NULL` : Prisma.sql`"utmSourceId" = ${filter.utmSourceId}`}
          AND "createdAt" BETWEEN ${filter.from} AND ${filter.to}
        GROUP BY day
        ORDER BY day ASC
      `;
      return rows.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        users: Number(r.users),
        phone_provided: Number(r.phone_provided),
        approved: Number(r.approved),
      }));
    }

    // Hamma source'lar bo'yicha kunma-kun
    const rows = await this.prisma.$queryRaw<
      Array<{
        day: Date;
        source_code: string;
        users: number;
        approved: number;
      }>
    >`
      SELECT
        DATE(u."createdAt") as day,
        COALESCE(s.code, 'direct') as source_code,
        COUNT(*)::int as users,
        COUNT(*) FILTER (WHERE u.status = 'APPROVED')::int as approved
      FROM "User" u
      LEFT JOIN "UtmSource" s ON u."utmSourceId" = s.id
      WHERE u."createdAt" BETWEEN ${filter.from} AND ${filter.to}
      GROUP BY day, source_code
      ORDER BY day ASC
    `;

    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      source_code: r.source_code,
      users: Number(r.users),
      approved: Number(r.approved),
    }));
  }

  // ──────────── Top sources (dashboard widget uchun) ────────────

  async getTopSources(
    limit = 5,
    filter?: { from?: Date; to?: Date },
  ): Promise<
    Array<{
      utmSourceId: string | null;
      code: string;
      name: string;
      totalUsers: number;
      approved: number;
    }>
  > {
    // Sana diapazoni — User.createdAt bo'yicha. Boundary'lar UTC Date'lar.
    // Postgres parametrlari $queryRaw bilan to'g'ridan-to'g'ri bog'lanadi.
    const from = filter?.from ?? new Date(0); // sentry: 1970
    const to = filter?.to ?? new Date(Date.now() + 24 * 3600 * 1000); // ertaga

    const rows = await this.prisma.$queryRaw<
      Array<{
        utmSourceId: string | null;
        code: string | null;
        name: string | null;
        totalUsers: bigint;
        approved: bigint;
      }>
    >`
      SELECT
        u."utmSourceId" as "utmSourceId",
        s.code as code,
        s.name as name,
        COUNT(*)::bigint as "totalUsers",
        COUNT(*) FILTER (WHERE u.status = 'APPROVED')::bigint as approved
      FROM "User" u
      LEFT JOIN "UtmSource" s ON u."utmSourceId" = s.id
      WHERE u."createdAt" >= ${from} AND u."createdAt" <= ${to}
      GROUP BY u."utmSourceId", s.code, s.name
      ORDER BY "totalUsers" DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      utmSourceId: r.utmSourceId,
      code: r.code ?? 'direct',
      name: r.name ?? "To'g'ridan-to'g'ri",
      totalUsers: Number(r.totalUsers),
      approved: Number(r.approved),
    }));
  }

  // ──────────── Helpers ────────────

  private pct(num: number, denom: number): number {
    if (denom === 0) return 0;
    return Math.round((num / denom) * 10000) / 100; // 2 ta o'nlik
  }
}
