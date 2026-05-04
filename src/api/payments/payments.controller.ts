// Admin panel uchun to'lovlar API.
// approve/reject — bevosita BotService.flow chaqiradi (xuddi guruhdagi tugmalar kabi).
// /photo — Telegram'dan rasmni proxy qilib qaytaradi (admin panel'da chek ko'rish uchun).

import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type { Response } from 'express';
import { JwtOrQueryGuard } from '../auth/jwt-or-query.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PaymentsService } from '../../payments/payments.service';
import { BotService } from '../../bot/bot.service';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { bigintToJson } from '../../common/utils/bigint.util';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';
import { ConfigService } from '@nestjs/config';

@UseGuards(JwtOrQueryGuard)
@Controller('payments')
export class PaymentsApiController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {}

  @Get('stats')
  async stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    return this.payments.stats(
      parseDateQuery(from, 'start'),
      parseDateQuery(to, 'end'),
    );
  }

  @Get()
  async list(
    @Query('status') status?: PaymentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const result = await this.payments.list({
      status,
      from: parseDateQuery(from, 'start'),
      to: parseDateQuery(to, 'end'),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return bigintToJson(result);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<unknown> {
    const payment = await this.payments.findById(id);
    return bigintToJson(payment);
  }

  /**
   * Telegram file_id orqali chek rasmini proxy qiladi.
   * 1) Bot API: getFile(file_id) → file_path
   * 2) https://api.telegram.org/file/bot<TOKEN>/<file_path> → binary
   * 3) Stream qilib qaytaradi.
   */
  @Get(':id/photo')
  async photo(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const payment = await this.payments.findById(id);
    if (!payment) throw new NotFoundException(`Payment #${id} not found`);

    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) throw new NotFoundException('BOT_TOKEN not configured');

    try {
      const file = await this.botService.bot.api.getFile(payment.photoFileId);
      if (!file.file_path) throw new NotFoundException('No file_path returned');

      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const upstream = await fetch(url);
      if (!upstream.ok || !upstream.body) {
        throw new NotFoundException(`Telegram file fetch failed: ${upstream.status}`);
      }

      // Cache 1 soat — file_path Telegram tomonidan ~1 soat amal qiladi.
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'image/jpeg',
      );
      const len = upstream.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);

      // Node 18+ Web ReadableStream → Node stream
      const reader = upstream.body.getReader();
      const pump = async (): Promise<void> => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      await pump();
    } catch (err) {
      throw new NotFoundException(
        `Failed to fetch photo: ${(err as Error).message}`,
      );
    }
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @Param('id') id: string,
    @CurrentAdmin() admin: JwtPayload,
  ): Promise<unknown> {
    const result = await this.botService.approvePaymentFlow(id, {
      actorLabel: admin.username,
      reviewedById: admin.sub,
    });
    return bigintToJson(result);
  }

  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @CurrentAdmin() admin: JwtPayload,
  ): Promise<unknown> {
    const payment = await this.botService.rejectPaymentFlow(id, {
      actorLabel: admin.username,
      reviewedById: admin.sub,
      reason: dto.reason,
    });
    return bigintToJson(payment);
  }
}
