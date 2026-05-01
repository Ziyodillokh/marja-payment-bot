// Root module — barcha feature modullarni va global infrastrukturani birlashtiradi.
// - ConfigModule: .env o'qish (global)
// - BullModule.forRoot: Redis ulanish + barcha queue'lar uchun umumiy
// - Domain modullari: Users, Payments, Settings, Broadcast, AutoMessages
// - Bot moduli: grammY
// - API moduli: REST endpointlar (admin panel uchun)

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { BotModule } from './bot/bot.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { AutoMessagesModule } from './auto-messages/auto-messages.module';
import { PointsModule } from './points/points.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { UtmModule } from './utm/utm.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600, count: 5000 },
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }),
    }),

    PrismaModule,
    SettingsModule,
    UsersModule,
    PaymentsModule,
    PointsModule,
    ReferralsModule,
    LeaderboardModule,
    UtmModule,
    BroadcastModule,
    AutoMessagesModule,
    BotModule,
    ApiModule,
  ],
})
export class AppModule {}
