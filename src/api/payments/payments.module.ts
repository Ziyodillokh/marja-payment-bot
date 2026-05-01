import { Module } from '@nestjs/common';
import { PaymentsApiController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsApiController],
})
export class PaymentsApiModule {}
