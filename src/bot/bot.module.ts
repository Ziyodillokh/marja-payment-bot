// Bot moduli — barcha bot tarkibiy qismlarini bog'laydi.
// BotService eksport qilinadi, chunki uni boshqa modullar (Broadcast, AutoMessages, API) ham
// ishlatadi (bot.api orqali xabar yuborish uchun).

import { Global, Module } from '@nestjs/common';

import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { BotUpdate } from './bot.update';

import { StartHandler } from './handlers/start.handler';
import { WelcomeHandler } from './handlers/welcome.handler';
import { ContactHandler } from './handlers/contact.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ReceiptHandler } from './handlers/receipt.handler';
import { AdminGroupHandler } from './handlers/admin-group.handler';

// Gamifikatsiya
import { BalanceHandler } from './handlers/balance.handler';
import { LeaderboardHandler } from './handlers/leaderboard.handler';
import { ReferralHandler } from './handlers/referral.handler';
import { CommentHandler } from './handlers/comment.handler';
import { ReactionHandler } from './handlers/reaction.handler';

@Global()
@Module({
  controllers: [BotController],
  providers: [
    BotService,
    BotUpdate,
    StartHandler,
    WelcomeHandler,
    ContactHandler,
    PaymentHandler,
    ReceiptHandler,
    AdminGroupHandler,
    BalanceHandler,
    LeaderboardHandler,
    ReferralHandler,
    CommentHandler,
    ReactionHandler,
  ],
  exports: [BotService],
})
export class BotModule {}
