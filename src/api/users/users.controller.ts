import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
  ) {}

  @Get('stats')
  async stats(): Promise<unknown> {
    return this.users.stats();
  }

  @Get()
  async list(
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const result = await this.users.list({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return bigintToJson(result);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<unknown> {
    const user = await this.users.getByIdOrThrow(id);
    const rank = await this.leaderboard.getUserRank(id);
    return bigintToJson({ ...user, rank });
  }

  // ──────────── GAMIFIKATSIYA ────────────

  @Get(':id/points-history')
  async pointsHistory(
    @Param('id', ParseIntPipe) id: number,
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
  async referralsOf(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    const [items, stats] = await Promise.all([
      this.referrals.listReferralsOf(id),
      this.referrals.getStats(id),
    ]);
    return bigintToJson({ items, stats });
  }

  @Post(':id/adjust-points')
  async adjustPoints(
    @Param('id', ParseIntPipe) id: number,
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
