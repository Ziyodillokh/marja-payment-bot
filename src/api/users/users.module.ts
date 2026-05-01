import { Module } from '@nestjs/common';
import { UsersApiController } from './users.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersApiController],
})
export class UsersApiModule {}
