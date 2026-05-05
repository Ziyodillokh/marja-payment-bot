// UTM source CRUD + analytics REST API.
// JWT bilan himoyalangan.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../api/auth/jwt-auth.guard';
import { CurrentAdmin } from '../api/auth/current-admin.decorator';
import type { JwtPayload } from '../api/auth/jwt.strategy';
import { UtmService } from './utm.service';
import { UtmAnalyticsService } from './utm-analytics.service';
import { parseDateQuery } from '../common/utils/parse-date-query.util';
import {
  tashkentTodayString,
  tashkentDayStart,
  tashkentDayEnd,
} from '../common/utils/tashkent-time.util';
import {
  CreateUtmSourceDto,
  UpdateUtmSourceDto,
} from './dto/utm-source.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class UtmController {
  constructor(
    private readonly utm: UtmService,
    private readonly analytics: UtmAnalyticsService,
    private readonly config: ConfigService,
  ) {}

  // ──────────── CRUD: /api/utm-sources ────────────

  @Get('utm-sources')
  async list(@Query('isActive') isActive?: string) {
    const filter: { isActive?: boolean } = {};
    if (isActive === 'true') filter.isActive = true;
    else if (isActive === 'false') filter.isActive = false;

    const sources = await this.utm.list(filter);
    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';

    // Har source uchun tayyor link
    return sources.map((s) => ({
      ...s,
      link: this.utm.generateLink(s.code, botUsername),
    }));
  }

  @Get('utm-sources/:id')
  async getById(@Param('id') id: string) {
    const source = await this.utm.getById(id);
    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';
    return {
      ...source,
      link: this.utm.generateLink(source.code, botUsername),
    };
  }

  @Post('utm-sources')
  async create(
    @Body() dto: CreateUtmSourceDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    const source = await this.utm.create(dto, admin.sub);
    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';
    return {
      ...source,
      link: this.utm.generateLink(source.code, botUsername),
    };
  }

  @Put('utm-sources/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUtmSourceDto,
  ) {
    return this.utm.update(id, dto);
  }

  @Delete('utm-sources/:id')
  async deactivate(@Param('id') id: string) {
    // O'chirish o'rniga deactivate (data integrity)
    return this.utm.deactivate(id);
  }

  /**
   * Tayyor link olish (referral bilan birlashtirish ham mumkin).
   * GET /api/utm-sources/:id/link?refUserId=<cuid>
   */
  @Get('utm-sources/:id/link')
  async getLink(
    @Param('id') id: string,
    @Query('refUserId') refUserId?: string,
  ): Promise<{ link: string }> {
    const source = await this.utm.getById(id);
    const botUsername = this.config.get<string>('BOT_USERNAME') ?? 'bot';
    return {
      link: this.utm.generateLink(source.code, botUsername, refUserId),
    };
  }

  // ──────────── ANALYTICS: /api/utm-analytics/* ────────────

  @Get('utm-analytics/funnel')
  async funnel(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('utmSourceId') utmSourceId?: string,
  ) {
    return this.analytics.getFunnelByUtmSource({
      from: parseDateQuery(from, 'start'),
      to: parseDateQuery(to, 'end'),
      utmSourceId: this.parseSourceFilter(utmSourceId),
    });
  }

  @Get('utm-analytics/daily')
  async daily(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('utmSourceId') utmSourceId?: string,
  ) {
    let fromDate = parseDateQuery(from, 'start');
    let toDate = parseDateQuery(to, 'end');

    if (!fromDate || !toDate) {
      // Default: oxirgi 30 kun (Tashkent vaqti bo'yicha)
      const today = tashkentTodayString();
      const [y, m, d] = today.split('-').map(Number);
      const todayUtcMs = Date.UTC(y, m - 1, d);
      const fromUtcMs = todayUtcMs - 29 * 24 * 3600 * 1000;
      const fromStr = new Date(fromUtcMs).toISOString().slice(0, 10);
      fromDate = tashkentDayStart(fromStr);
      toDate = tashkentDayEnd(today);
    }

    return this.analytics.getDaily({
      from: fromDate,
      to: toDate,
      utmSourceId: this.parseSourceFilter(utmSourceId),
    });
  }

  @Get('utm-analytics/comparison')
  async comparison(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Comparison — funnel'ning qisqartirilgan ko'rinishi (barcha source'lar)
    return this.analytics.getFunnelByUtmSource({
      from: parseDateQuery(from, 'start'),
      to: parseDateQuery(to, 'end'),
    });
  }

  // ──────────── Helpers ────────────

  /**
   * `?utmSourceId=null` → null (direct)
   * `?utmSourceId=cmoxxxxx` → cuid string
   * yo'q → undefined (hammasi)
   */
  private parseSourceFilter(value?: string): string | null | undefined {
    if (value === undefined || value === '') return undefined;
    if (value === 'null' || value === 'direct') return null;
    return value;
  }
}
