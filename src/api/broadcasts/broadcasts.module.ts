import { Module } from '@nestjs/common';
import { BroadcastsApiController } from './broadcasts.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BroadcastsApiController],
})
export class BroadcastsApiModule {}
