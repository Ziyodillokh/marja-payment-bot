import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PointsService } from '../../points/points.service';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';

@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly points: PointsService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  @Get('stats')
  async stats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const [pointsStats, activePlayers] = await Promise.all([
      this.points.stats(fromDate, toDate),
      this.leaderboard.getActivePlayersCount(),
    ]);
    return { points: pointsStats, activePlayers };
  }
}
