// UsersService — foydalanuvchilar bilan ishlash uchun yagona joy.
// Bot va API ikkalasi ham shu yerga keladi.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

export interface UserListFilter {
  status?: UserStatus;
  search?: string; // username, ism, telefon bo'yicha
  // UTM filter: cuid string (bitta source) | null (direct, source'siz) | undefined (hammasi)
  utmSourceId?: string | null;
  // createdAt sana diapazoni (ISO timestamp). Inclusive.
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────── BOT FLOW ────────────

  async findOrCreateByTelegramId(dto: CreateUserDto): Promise<User> {
    return (await this.findOrCreate(dto)).user;
  }

  /**
   * findOrCreate — yangi user yaratilgan-yaratilmaganini bildiradi.
   * Referral logikasi shu flagga bog'liq: faqat YANGI user'ga referral qabul qilinadi.
   *
   * Pattern:
   *   1. findUnique
   *   2. yo'q bo'lsa create — P2002 (race) bo'lsa qaytadan findUnique
   */
  async findOrCreate(
    dto: CreateUserDto,
  ): Promise<{ user: User; isNew: boolean }> {
    const existing = await this.prisma.user.findUnique({
      where: { telegramId: dto.telegramId },
    });
    if (existing) {
      // Update qilamiz (Telegram username/ism o'zgargan bo'lishi mumkin).
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          username: dto.username ?? undefined,
          firstName: dto.firstName ?? undefined,
          lastName: dto.lastName ?? undefined,
          languageCode: dto.languageCode ?? undefined,
        },
      });
      return { user, isNew: false };
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          telegramId: dto.telegramId,
          username: dto.username ?? null,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          languageCode: dto.languageCode ?? null,
          status: UserStatus.NEW,
          // ───── First-touch UTM attribution ─────
          // Faqat YANGI user yaratilganda yoziladi.
          // Mavjud user qayta /start bossa, eski source'i o'zgarmaydi.
          utmSourceId: dto.utmSourceId ?? null,
          utmRawParam: dto.utmRawParam ?? null,
        },
      });
      return { user, isNew: true };
    } catch (err) {
      // Race condition: bir paytda 2 ta /start kelishi mumkin.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const user = await this.prisma.user.findUniqueOrThrow({
          where: { telegramId: dto.telegramId },
        });
        return { user, isNew: false };
      }
      throw err;
    }
  }

  async exists(telegramId: bigint): Promise<boolean> {
    const u = await this.prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });
    return !!u;
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }

  /**
   * UTM source'ni FAQAT mavjud bo'lmagan paytda yozadi (first-touch).
   * Bu update boshqa /start chaqiruvlarida ham bezarar — utmSourceId allaqachon
   * o'rnatilgan bo'lsa, hech narsa o'zgarmaydi.
   *
   * `updateMany + where: { utmSourceId: null }` atomik tarzda first-touch'ni kafolatlaydi.
   */
  async setUtmSourceIfMissing(
    userId: string,
    utmSourceId: string,
    rawParam: string,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, utmSourceId: null },
      data: { utmSourceId, utmRawParam: rawParam },
    });
    return result.count > 0;
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getByIdOrThrow(id: string): Promise<User> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { utmSource: { select: { id: true, code: true, name: true } } },
    });
    if (!u) throw new NotFoundException(`User #${id} not found`);
    return u;
  }

  async updatePhone(userId: string, phoneNumber: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        status: UserStatus.PHONE_PROVIDED,
      },
    });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async markPaymentStarted(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { paymentStartedAt: new Date() },
    });
  }

  async markApproved(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async markBlocked(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.BLOCKED },
    });
  }

  // ──────────── ADMIN PANEL / API ────────────

  async list(filter: UserListFilter): Promise<{
    items: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

    const where: Prisma.UserWhereInput = {};
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.search) {
      where.OR = [
        { username: { contains: filter.search, mode: 'insensitive' } },
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filter.search } },
      ];
    }
    // UTM filter: null (direct) yoki specific source.
    if (filter.utmSourceId !== undefined) {
      where.utmSourceId = filter.utmSourceId;
    }
    // Sana diapazoni — createdAt bo'yicha
    if (filter.from || filter.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = filter.from;
      if (filter.to) where.createdAt.lte = filter.to;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { utmSource: { select: { id: true, code: true, name: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async stats(): Promise<{
    total: number;
    byStatus: Record<UserStatus, number>;
    todayNew: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, grouped, todayNew] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    ]);

    const byStatus = Object.fromEntries(
      Object.values(UserStatus).map((s) => [s, 0]),
    ) as Record<UserStatus, number>;
    for (const g of grouped) {
      const count = (g._count as { _all?: number } | undefined)?._all ?? 0;
      byStatus[g.status] = count;
    }

    return { total, byStatus, todayNew };
  }

  // ──────────── BROADCAST FILTER ────────────

  async findIdsByFilter(filter: 'ALL' | 'PAID' | 'UNPAID' | 'PENDING'): Promise<string[]> {
    let where: Prisma.UserWhereInput = {};
    switch (filter) {
      case 'ALL':
        where = { status: { not: UserStatus.BLOCKED } };
        break;
      case 'PAID':
        where = { status: UserStatus.APPROVED };
        break;
      case 'UNPAID':
        where = { status: { in: [UserStatus.NEW, UserStatus.PHONE_PROVIDED] } };
        break;
      case 'PENDING':
        where = { status: UserStatus.PAYMENT_PENDING };
        break;
    }
    const rows = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
