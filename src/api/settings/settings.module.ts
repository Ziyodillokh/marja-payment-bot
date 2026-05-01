import { Module } from '@nestjs/common';
import { SettingsApiController } from './settings.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtOrQueryGuard } from '../auth/jwt-or-query.guard';

@Module({
  imports: [AuthModule],
  controllers: [SettingsApiController],
  providers: [JwtOrQueryGuard],
})
export class SettingsApiModule {}
