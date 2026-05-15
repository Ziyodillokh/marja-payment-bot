// AutoMessagesScheduler — DOIMIY ishlaydigan cron job.
//
// Strategiya:
//   Har 1 daqiqada (BullMQ repeat-cron) ishga tushadi.
//   Aktiv auto-message'larni topadi, har biriga MOS userlarni qidiradi:
//     - User status trigger sharti bilan mos
//     - Trigger vaqtidan ko'p vaqt o'tgan (createdAt yoki paymentStartedAt + triggerAfter)
//     - AutoMessageLog'da yo'q (avval yuborilmagan)
//   Va mos userlarga xabar yuboradi (per-user idempotent).
//
// Bu shuni anglatadiki:
//   - Yangi user /start bossa va to'lov qilmasa, 1 soat o'tib avto-xabar oladi
//   - Bot to'xtatib qayta yoqilsa ham — qayta yuboradi
//   - Admin yangi auto-message qo'shsa, eski user'lar ham qabul qiladi (sharti mos bo'lsa)
//
// Idempotency: AutoMessageLog @@unique([autoMessageId, userId]) — qayta yuborilmaydi.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TriggerType, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AUTO_MESSAGE_JOBS,
  QUEUE_NAMES,
} from '../common/enums/queue-names.enum';
import type { AutoMessageJobPayload } from './auto-messages.service';

const CRON_JOB_NAME = 'auto-message-scheduler-tick';
const CRON_INTERVAL_MS = 60_000; // har 1 daqiqa
const BATCH_SIZE = 50; // bir tickda max nechta xabar yuborish

@Injectable()
export class AutoMessagesScheduler implements OnModuleInit {
  private readonly logger = new Logger(AutoMessagesScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.AUTO_MESSAGE)
    private readonly queue: Queue<AutoMessageJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Repeat job — har 1 daqiqada SCAN ishga tushadi.
    // jobId — barqaror, qayta-qayta qo'shilmasin.
    try {
      // Avval eski repeat'larni tozalaymiz (config o'zgargan bo'lishi mumkin).
      const repeats = await this.queue.getRepeatableJobs();
      for (const r of repeats) {
        if (r.name === CRON_JOB_NAME) {
          await this.queue.removeRepeatableByKey(r.key);
        }
      }

      await this.queue.add(
        CRON_JOB_NAME,
        {} as AutoMessageJobPayload,
        {
          repeat: { every: CRON_INTERVAL_MS },
          jobId: CRON_JOB_NAME,
          removeOnComplete: { count: 5 },
          removeOnFail: { count: 10 },
        },
      );
      this.logger.log(
        `Auto-message scheduler started — har ${CRON_INTERVAL_MS / 1000}s`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to start scheduler: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Bitta tick — ishlash mantiqi.
   * Processor shuni chaqiradi.
   */
  async runTick(): Promise<{ scheduled: number }> {
    const messages = await this.prisma.autoMessage.findMany({
      where: { isActive: true },
    });
    if (messages.length === 0) return { scheduled: 0 };

    const now = Date.now();
    let totalScheduled = 0;

    for (const m of messages) {
      const thresholdDate = new Date(now - m.triggerAfter * 1000);
      // Trigger sharti
      const where = this.buildUserWhereForTrigger(m.triggerType, thresholdDate);
      if (!where) continue;

      // Ushbu auto-message'ni allaqachon olganlarni chiqarib tashlaymiz.
      const candidates = await this.prisma.user.findMany({
        where: {
          ...where,
          NOT: {
            autoMessageLogs: { some: { autoMessageId: m.id } },
          },
        },
        select: { id: true },
        take: BATCH_SIZE,
      });

      for (const u of candidates) {
        const jobId = `am_${m.id}_u_${u.id}`;
        try {
          await this.queue.add(
            AUTO_MESSAGE_JOBS.SEND,
            { autoMessageId: m.id, userId: u.id },
            { jobId, removeOnComplete: true },
          );
          totalScheduled++;
        } catch {
          // Duplicate jobId — silent skip
        }
      }
    }

    if (totalScheduled > 0) {
      this.logger.log(`Scheduled ${totalScheduled} auto-message(s)`);
    }
    return { scheduled: totalScheduled };
  }

  /**
   * Trigger turi → User WHERE filter.
   * Trigger vaqti `triggerAfter` soniya o'tgan bo'lishi kerak.
   */
  private buildUserWhereForTrigger(
    trigger: TriggerType,
    thresholdDate: Date,
  ) {
    switch (trigger) {
      case TriggerType.AFTER_START_NO_PAYMENT:
        // /start bosgan, to'lov qilmagan, X vaqt o'tgan
        return {
          status: { in: [UserStatus.NEW, UserStatus.PHONE_PROVIDED] },
          startedAt: { lte: thresholdDate },
        };
      case TriggerType.AFTER_PHONE_NO_PAYMENT:
        // Telefon bergan, to'lov qilmagan, X vaqt o'tgan.
        // phoneProvidedAt — kontakt bo'lganda o'rnatiladi; updatedAt ishlatib bo'lmaydi
        // (boshqa update'lar reset qilardi: ball berish, profil yangilash va h.k.).
        return {
          status: UserStatus.PHONE_PROVIDED,
          phoneProvidedAt: { lte: thresholdDate, not: null },
        };
      case TriggerType.AFTER_PAYMENT_NO_APPROVAL:
        // Chek yuborgan, hali tasdiqlanmagan, X vaqt o'tgan
        return {
          status: UserStatus.PAYMENT_PENDING,
          paymentStartedAt: { lte: thresholdDate, not: null },
        };
      default:
        return null;
    }
  }
}
