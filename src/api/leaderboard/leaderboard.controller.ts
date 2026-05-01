import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardService } from '../../leaderboard/leaderboard.service';
import { bigintToJson } from '../../common/utils/bigint.util';

@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardApiController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  async top(@Query('limit') limit?: string): Promise<unknown> {
    const items = await this.leaderboard.getTop(limit ? Number(limit) : 100);
    return bigintToJson({ items, total: items.length });
  }
}
