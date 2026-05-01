import { Module } from '@nestjs/common';
import { SettingsApiController } from './settings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SettingsApiController],
})
export class SettingsApiModule {}
