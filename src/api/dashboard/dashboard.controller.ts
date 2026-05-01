import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../../users/users.service';
import { PaymentsService } from '../../payments/payments.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('stats')
  async stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{
    users: Awaited<ReturnType<UsersService['stats']>>;
    payments: Awaited<ReturnType<PaymentsService['stats']>>;
  }> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const [userStats, paymentStats] = await Promise.all([
      this.users.stats(),
      this.payments.stats(fromDate, toDate),
    ]);

    return { users: userStats, payments: paymentStats };
  }
}
