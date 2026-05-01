import { Module } from '@nestjs/common';
import { LeaderboardApiController } from './leaderboard.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LeaderboardApiController],
})
export class LeaderboardApiModule {}
