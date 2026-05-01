import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PointsTransactionType, UserStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsersService } from '../../users/users.service';
import { PointsService } from '../../points/points.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { PaymentsService } from '../../payments/payments.service';
import { bigintToJson } from '../../common/utils/bigint.util';
import { AdjustPointsDto } from './dto/adjust-points.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersApiController {
  constructor(
    private readonly users: UsersService,
    private readonly points: PointsService,
    private readonly referrals: ReferralsService,
    private readonly leaderboard: LeaderboardService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('stats')
  async stats(): Promise<unknown> {
    return this.users.stats();
  }

  @Get()
  async list(
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('utmSourceId') utmSourceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const result = await this.users.list({
      status,
      search,
      // ?utmSourceId=null|direct → null (manbasiz), cuid → specific source
      utmSourceId:
        utmSourceId === undefined || utmSourceId === ''
          ? undefined
          : utmSourceId === 'null' || utmSourceId === 'direct'
            ? null
            : utmSourceId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return bigintToJson(result);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<unknown> {
    const user = await this.users.getByIdOrThrow(id);
    const rank = await this.leaderboard.getUserRank(id);
    return bigintToJson({ ...user, rank });
  }

  @Get(':id/overview')
  async overview(@Param('id') id: string): Promise<unknown> {
    const user = await this.users.getByIdOrThrow(id);

    const [rank, referralStats, pointsHistory, paymentsList] =
      await Promise.all([
        this.leaderboard.getUserRank(id),
        this.referrals.getStats(id),
        this.points.listHistory({ userId: id, page: 1, limit: 10 }),
        this.payments.list({ userId: id, page: 1, limit: 20 }),
      ]);

    return bigintToJson({
      user: { ...user, rank },
      referralStats,
      pointsHistory,
      payments: paymentsList.items,
    });
  }

  // ──────────── GAMIFIKATSIYA ────────────

  @Get(':id/points-history')
  async pointsHistory(
    @Param('id') id: string,
    @Query('type') type?: PointsTransactionType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const result = await this.points.listHistory({
      userId: id,
      type,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return bigintToJson(result);
  }

  @Get(':id/referrals')
  async referralsOf(@Param('id') id: string): Promise<unknown> {
    const [items, stats] = await Promise.all([
      this.referrals.listReferralsOf(id),
      this.referrals.getStats(id),
    ]);
    return bigintToJson({ items, stats });
  }

  @Post(':id/adjust-points')
  async adjustPoints(
    @Param('id') id: string,
    @Body() dto: AdjustPointsDto,
    @CurrentAdmin() admin: JwtPayload,
  ): Promise<unknown> {
    await this.users.getByIdOrThrow(id);
    const tx = await this.points.award({
      userId: id,
      amount: dto.amount,
      type: PointsTransactionType.ADMIN_ADJUSTMENT,
      description:
        dto.reason ?? `Admin adjustment by ${admin.username} (#${admin.sub})`,
    });
    return bigintToJson(tx);
  }
}
