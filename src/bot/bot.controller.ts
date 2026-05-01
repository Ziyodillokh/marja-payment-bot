// Webhook rejimi uchun HTTP endpoint.
// .env: BOT_MODE=webhook, BOT_WEBHOOK_URL=https://.../bot/webhook
// X-Telegram-Bot-Api-Secret-Token header BOT_WEBHOOK_SECRET bilan tekshiriladi.

import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    const expected = this.config.get<string>('BOT_WEBHOOK_SECRET');
    if (expected && secretHeader !== expected) {
      throw new ForbiddenException('Invalid secret token');
    }
    // grammY Update tipi keng — runtime'da telegramdan keladi.
    await this.botService.bot.handleUpdate(body as never);
  }
}
