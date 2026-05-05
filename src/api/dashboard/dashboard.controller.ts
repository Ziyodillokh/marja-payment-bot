import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../../users/users.service';
import { PaymentsService } from '../../payments/payments.service';
import { UtmAnalyticsService } from '../../utm/utm-analytics.service';
import { bigintToJson } from '../../common/utils/bigint.util';
import { parseDateQuery } from '../../common/utils/parse-date-query.util';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
    private readonly utmAnalytics: UtmAnalyticsService,
  ) {}

  @Get('stats')
  async stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    const fromDate = parseDateQuery(from, 'start');
    const toDate = parseDateQuery(to, 'end');

    const [userStats, paymentStats, topUtmSources] = await Promise.all([
      this.users.stats({ from: fromDate, to: toDate }),
      this.payments.stats(fromDate, toDate),
      this.utmAnalytics.getTopSources(5, { from: fromDate, to: toDate }),
    ]);

    return bigintToJson({
      users: userStats,
      payments: paymentStats,
      topUtmSources,
    });
  }
}
