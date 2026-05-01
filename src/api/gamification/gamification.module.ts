import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GamificationController],
})
export class GamificationApiModule {}
