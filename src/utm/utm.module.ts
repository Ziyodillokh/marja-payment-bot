import { Global, Module } from '@nestjs/common';
import { UtmService } from './utm.service';
import { UtmAnalyticsService } from './utm-analytics.service';
import { UtmController } from './utm.controller';
import { AuthModule } from '../api/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule], // JwtAuthGuard uchun
  controllers: [UtmController],
  providers: [UtmService, UtmAnalyticsService],
  exports: [UtmService, UtmAnalyticsService],
})
export class UtmModule {}
