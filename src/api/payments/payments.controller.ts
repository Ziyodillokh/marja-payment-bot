// Admin panel uchun to'lovlar API.
// approve/reject — bevosita BotService.flow chaqiradi (xuddi guruhdagi tugmalar kabi).

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PaymentsService } from '../../payments/payments.service';
import { BotService } from '../../bot/bot.service';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { bigintToJson } from '../../common/utils/bigint.util';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsApiController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly botService: BotService,
  ) {}

  @Get('stats')
  async stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    return this.payments.stats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get()
  async list(
    @Query('status') status?: PaymentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const result = await this.payments.list({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return bigintToJson(result);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const payment = await this.payments.findById(id);
    return bigintToJson(payment);
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', ParseIntPipe) id: number,
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
    @Param('id', ParseIntPipe) id: number,
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
