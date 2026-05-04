// PaymentsService — to'lov chek yozuvlari bilan ishlash uchun.
// Approve/reject biznes mantig'i — shu yerda. Bot va API ikkalasi shu metodni chaqiradi.

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Payment,
  PaymentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

export interface PaymentListFilter {
  status?: PaymentStatus;
  userId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────── BOT FLOW ────────────

  async create(dto: CreatePaymentDto): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: dto.userId,
          amount: new Prisma.Decimal(dto.amount as Prisma.Decimal.Value),
          photoFileId: dto.photoFileId,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.user.update({
        where: { id: dto.userId },
        data: { status: UserStatus.PAYMENT_PENDING },
      });

      return payment;
    });
  }

  async setGroupMessage(
    paymentId: string,
    groupChatId: bigint,
    groupMessageId: number,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { groupChatId, groupMessageId },
    });
  }

  // ──────────── APPROVE / REJECT (BOT + API uchun umumiy) ────────────

  /**
   * Atomik approve: Payment.status = APPROVED, User.status = APPROVED.
   * `reviewedById` ixtiyoriy (botdan kelganda admin Telegram ID emas, NULL).
   * Tashqi side-effect (kanalga qo'shish, xabar yuborish) BOT yoki API qatlamida.
   */
  async approve(paymentId: string, reviewedById?: string): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException(`Payment #${paymentId} not found`);
      }
      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment #${paymentId} already ${payment.status}`,
        );
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.APPROVED,
          reviewedById: reviewedById ?? null,
          reviewedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          status: UserStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      return updated;
    });
  }

  async reject(
    paymentId: string,
    reviewedById?: string,
    reason?: string,
  ): Promise<Payment> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException(`Payment #${paymentId} not found`);
      }
      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment #${paymentId} already ${payment.status}`,
        );
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REJECTED,
          reviewedById: reviewedById ?? null,
          reviewedAt: new Date(),
          rejectionReason: reason ?? null,
        },
      });

      // User'ga qaytadan to'lash imkoniyatini qaytaramiz.
      await tx.user.update({
        where: { id: payment.userId },
        data: { status: UserStatus.PHONE_PROVIDED },
      });

      return updated;
    });
  }

  // ──────────── ADMIN PANEL ────────────

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async getByIdOrThrow(id: string): Promise<Payment> {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Payment #${id} not found`);
    return p;
  }

  async list(filter: PaymentListFilter): Promise<{
    items: Payment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

    const where: Prisma.PaymentWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;
    if (filter.from || filter.to) {
      where.createdAt = {};
      if (filter.from) where.createdAt.gte = filter.from;
      if (filter.to) where.createdAt.lte = filter.to;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async stats(from?: Date, to?: Date): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: string;
    approvedAmount: string;
  }> {
    const where: Prisma.PaymentWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const grouped = await this.prisma.payment.groupBy({
      by: ['status'],
      where,
      orderBy: { status: 'asc' },
      _count: { _all: true },
      _sum: { amount: true },
    });

    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = new Prisma.Decimal(0);
    let approvedAmount = new Prisma.Decimal(0);

    for (const g of grouped) {
      const count = g._count?._all ?? 0;
      total += count;
      const amount = g._sum?.amount ?? new Prisma.Decimal(0);
      totalAmount = totalAmount.plus(amount);

      switch (g.status) {
        case PaymentStatus.PENDING:
          pending = count;
          break;
        case PaymentStatus.APPROVED:
          approved = count;
          approvedAmount = amount;
          break;
        case PaymentStatus.REJECTED:
          rejected = count;
          break;
      }
    }

    return {
      total,
      pending,
      approved,
      rejected,
      totalAmount: totalAmount.toString(),
      approvedAmount: approvedAmount.toString(),
    };
  }
}
