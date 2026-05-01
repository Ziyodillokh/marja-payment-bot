import { Module } from '@nestjs/common';
import { ReferralsApiController } from './referrals.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReferralsApiController],
})
export class ReferralsApiModule {}
