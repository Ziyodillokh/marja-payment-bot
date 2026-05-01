// AutoMessage processor — delayed job ishga tushganda:
// 1. AutoMessage hali aktivmi?
// 2. User hali ham trigger sharti ostida turibdi mi (status tekshiruvi)?
// 3. Allaqachon yuborilmaganmi (dublikat himoyasi)?
// 4. Telegram'ga yuboramiz, log yozamiz.
// 403 (bot bloklangan) → user'ni BLOCKED qilamiz.

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GrammyError } from 'grammy';
import { TriggerType, UserStatus } from '@prisma/client';

import {
  AutoMessageJobPayload,
  AutoMessagesService,
} from './auto-messages.service';
import { AutoMessagesScheduler } from './auto-messages.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { BotService } from '../bot/bot.service';
import {
  AUTO_MESSAGE_JOBS,
  QUEUE_NAMES,
} from '../common/enums/queue-names.enum';

@Processor(QUEUE_NAMES.AUTO_MESSAGE)
export class AutoMessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(AutoMessagesProcessor.name);

  constructor(
    private readonly service: AutoMessagesService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly botService: BotService,
    private readonly scheduler: AutoMessagesScheduler,
  ) {
    super();
  }

  async process(job: Job<AutoMessageJobPayload>): Promise<void> {
    // Scheduler tick — har 1 daqiqada ishga tushadi.
    if (job.name === 'auto-message-scheduler-tick') {
      await this.scheduler.runTick();
      return;
    }

    if (job.name !== AUTO_MESSAGE_JOBS.SEND) return;

    const { autoMessageId, userId } = job.data;

    const message = await this.prisma.autoMessage.findUnique({
      where: { id: autoMessageId },
    });
    if (!message || !message.isActive) {
      this.logger.debug(`AutoMessage #${autoMessageId} inactive/deleted — skip`);
      return;
    }

    if (await this.service.hasBeenSent(autoMessageId, userId)) {
      this.logger.debug(
        `AutoMessage #${autoMessageId} already sent to user #${userId} — skip`,
      );
      return;
    }

    const user = await this.users.findById(userId);
    if (!user) return;
    if (user.status === UserStatus.BLOCKED) return;

    // Trigger sharti hali ham bajarilayaptimi?
    if (!this.shouldStillSend(message.triggerType, user.status)) {
      this.logger.debug(
        `User #${userId} status=${user.status} no longer matches trigger=${message.triggerType} — skip`,
      );
      return;
    }

    try {
      await this.send(user.telegramId, message);
      await this.service.logSent(autoMessageId, userId);
      this.logger.log(
        `AutoMessage #${autoMessageId} sent to user #${userId}`,
      );
    } catch (err) {
      if (err instanceof GrammyError && err.error_code === 403) {
        await this.users.markBlocked(userId);
        this.logger.warn(`User #${userId} blocked the bot`);
        return;
      }
      throw err;
    }
  }

  private shouldStillSend(
    trigger: TriggerType,
    status: UserStatus,
  ): boolean {
    switch (trigger) {
      case TriggerType.AFTER_START_NO_PAYMENT:
        return status === UserStatus.NEW || status === UserStatus.PHONE_PROVIDED;
      case TriggerType.AFTER_PHONE_NO_PAYMENT:
        return status === UserStatus.PHONE_PROVIDED;
      case TriggerType.AFTER_PAYMENT_NO_APPROVAL:
        return status === UserStatus.PAYMENT_PENDING;
      default:
        return false;
    }
  }

  private async send(
    telegramId: bigint,
    message: { text: string; mediaFileId: string | null; mediaType: string | null },
  ): Promise<void> {
    const chatId = telegramId.toString();
    const api = this.botService.bot.api;

    if (!message.mediaFileId) {
      await api.sendMessage(chatId, message.text, { parse_mode: 'HTML' });
      return;
    }

    switch (message.mediaType) {
      case 'photo':
        await api.sendPhoto(chatId, message.mediaFileId, {
          caption: message.text,
          parse_mode: 'HTML',
        });
        break;
      case 'video':
        await api.sendVideo(chatId, message.mediaFileId, {
          caption: message.text,
          parse_mode: 'HTML',
        });
        break;
      case 'document':
        await api.sendDocument(chatId, message.mediaFileId, {
          caption: message.text,
          parse_mode: 'HTML',
        });
        break;
      case 'audio':
        await api.sendAudio(chatId, message.mediaFileId, {
          caption: message.text,
          parse_mode: 'HTML',
        });
        break;
      default:
        await api.sendMessage(chatId, message.text, { parse_mode: 'HTML' });
    }
  }
}
