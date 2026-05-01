import { Module } from '@nestjs/common';
import { PaymentsApiController } from './payments.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtOrQueryGuard } from '../auth/jwt-or-query.guard';

@Module({
  imports: [AuthModule], // AuthModule JwtModule + ConfigModule eksport qiladi
  controllers: [PaymentsApiController],
  providers: [JwtOrQueryGuard],
})
export class PaymentsApiModule {}
