import { Module } from '@nestjs/common';
import { AutoMessagesApiController } from './auto-messages.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AutoMessagesApiController],
})
export class AutoMessagesApiModule {}
