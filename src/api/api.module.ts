// API moduli — barcha REST endpointlarni birlashtiradi.
// Domain xizmatlar (UsersService, PaymentsService, va h.k.) global modul'lardan keladi.

import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { UsersApiModule } from './users/users.module';
import { PaymentsApiModule } from './payments/payments.module';
import { SettingsApiModule } from './settings/settings.module';
import { BroadcastsApiModule } from './broadcasts/broadcasts.module';
import { AutoMessagesApiModule } from './auto-messages/auto-messages.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { LeaderboardApiModule } from './leaderboard/leaderboard.module';
import { ReferralsApiModule } from './referrals/referrals.module';
import { GamificationApiModule } from './gamification/gamification.module';

@Module({
  imports: [
    AuthModule,
    UsersApiModule,
    PaymentsApiModule,
    SettingsApiModule,
    BroadcastsApiModule,
    AutoMessagesApiModule,
    DashboardModule,
    AdminModule,
    LeaderboardApiModule,
    ReferralsApiModule,
    GamificationApiModule,
  ],
})
export class ApiModule {}
