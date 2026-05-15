// BotUpdate — barcha grammY handler'larini bot instance'iga register qiladi.
// Nest lifecycle: BotUpdate.onModuleInit avval (BotService.bot mavjud, hali start emas),
// keyin BotService.onModuleInit'da bot.start() chaqiriladi.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotContext } from './bot.context';
import { UsersService } from '../users/users.service';
import { buildUserRegisterMiddleware } from './middlewares/user-register.middleware';
import { StartHandler } from './handlers/start.handler';
import { ContactHandler } from './handlers/contact.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { ReceiptHandler } from './handlers/receipt.handler';
import { AdminGroupHandler } from './handlers/admin-group.handler';
import { BalanceHandler } from './handlers/balance.handler';
import { LeaderboardHandler } from './handlers/leaderboard.handler';
import { ReferralHandler } from './handlers/referral.handler';
import { CommentHandler } from './handlers/comment.handler';
import { ReactionHandler } from './handlers/reaction.handler';
import { ProgramHandler } from './handlers/program.handler';

@Injectable()
export class BotUpdate implements OnModuleInit {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(
    private readonly botService: BotService,
    private readonly users: UsersService,
    private readonly startHandler: StartHandler,
    private readonly contactHandler: ContactHandler,
    private readonly paymentHandler: PaymentHandler,
    private readonly receiptHandler: ReceiptHandler,
    private readonly adminGroupHandler: AdminGroupHandler,
    private readonly balanceHandler: BalanceHandler,
    private readonly leaderboardHandler: LeaderboardHandler,
    private readonly referralHandler: ReferralHandler,
    private readonly commentHandler: CommentHandler,
    private readonly reactionHandler: ReactionHandler,
    private readonly programHandler: ProgramHandler,
  ) {}

  onModuleInit(): void {
    const bot = this.botService.bot;

    // ─────────── MIDDLEWARES ───────────
    bot.use(buildUserRegisterMiddleware(this.users));

    // ─────────── COMMANDS (private chat) ───────────

    bot.command('start', async (ctx) => {
      try {
        await this.startHandler.handle(ctx);
      } catch (err) {
        this.logError('start', err);
        await this.safeReply(ctx, 'Xatolik yuz berdi, qayta urining.');
      }
    });

    bot.command(['balance', 'points'], async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      try {
        await this.balanceHandler.handle(ctx);
      } catch (err) {
        this.logError('balance', err);
      }
    });

    bot.command(['top', 'leaderboard'], async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      try {
        await this.leaderboardHandler.handle(ctx);
      } catch (err) {
        this.logError('leaderboard', err);
      }
    });

    bot.command('referral', async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      try {
        await this.referralHandler.handle(ctx);
      } catch (err) {
        this.logError('referral', err);
      }
    });

    // ─────────── PRIVATE CHAT MESSAGES ───────────

    bot.on('message:contact', async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      try {
        await this.contactHandler.handle(ctx);
      } catch (err) {
        this.logError('contact', err);
        await this.safeReply(ctx, 'Xatolik yuz berdi, qayta urining.');
      }
    });

    bot.on('message:photo', async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      try {
        await this.receiptHandler.handle(ctx);
      } catch (err) {
        this.logError('receipt', err);
        await this.safeReply(ctx, 'Xatolik yuz berdi, qayta urining.');
      }
    });

    // ─────────── DISCUSSION GROUP MESSAGES (izohlar) ───────────

    bot.on('message:text', async (ctx, next) => {
      // Faqat guruh xabarlari (private chat'larda commentHandler ishlatilmaydi).
      if (ctx.chat?.type === 'private') return next();
      try {
        const handled = await this.commentHandler.handle(ctx);
        if (!handled) return next();
      } catch (err) {
        this.logError('comment', err);
      }
    });

    // ─────────── REACTIONS ───────────

    bot.on('message_reaction', async (ctx) => {
      try {
        await this.reactionHandler.handle(ctx);
      } catch (err) {
        this.logError('reaction', err);
      }
    });

    // ─────────── CALLBACKS ───────────

    bot.callbackQuery('pay', async (ctx) => {
      try {
        await this.paymentHandler.handle(ctx);
      } catch (err) {
        this.logError('payment callback', err);
        await ctx.answerCallbackQuery({ text: 'Xatolik yuz berdi.' });
      }
    });

    bot.callbackQuery('program', async (ctx) => {
      try {
        await ctx.answerCallbackQuery();
        await this.programHandler.send(ctx);
      } catch (err) {
        this.logError('program callback', err);
      }
    });

    bot.callbackQuery('balance', async (ctx) => {
      try {
        await ctx.answerCallbackQuery();
        await this.balanceHandler.handle(ctx);
      } catch (err) {
        this.logError('balance callback', err);
      }
    });

    bot.callbackQuery('leaderboard', async (ctx) => {
      try {
        await this.leaderboardHandler.handle(ctx, true);
      } catch (err) {
        this.logError('leaderboard callback', err);
        await ctx.answerCallbackQuery();
      }
    });

    bot.callbackQuery('referral', async (ctx) => {
      try {
        await this.referralHandler.handle(ctx, true);
      } catch (err) {
        this.logError('referral callback', err);
        await ctx.answerCallbackQuery();
      }
    });

    // approve:{cuid}, approve_confirm:{cuid}, approve_cancel:{cuid}
    // reject:{cuid},  reject_confirm:{cuid},  reject_cancel:{cuid}
    // cuid format: 20-30 alphanumeric chars
    bot.callbackQuery(/^approve:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleApprove(ctx, ctx.match[1]);
    });
    bot.callbackQuery(/^approve_confirm:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleApproveConfirm(ctx, ctx.match[1]);
    });
    bot.callbackQuery(/^approve_cancel:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleCancel(ctx);
    });
    bot.callbackQuery(/^reject:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleReject(ctx, ctx.match[1]);
    });
    bot.callbackQuery(/^reject_confirm:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleRejectConfirm(ctx, ctx.match[1]);
    });
    bot.callbackQuery(/^reject_cancel:([a-z0-9]{20,30})$/i, async (ctx) => {
      await this.adminGroupHandler.handleCancel(ctx);
    });

    // ─────────── PRIVATE FALLBACK ───────────

    bot.on('message', async (ctx) => {
      if (ctx.chat?.type !== 'private') return;
      await this.safeReply(
        ctx,
        "Iltimos, /start komandasini bering yoki /balance va /top ni sinab ko'ring.",
      );
    });

    this.logger.log('Bot handlers registered');
  }

  private logError(name: string, err: unknown): void {
    this.logger.error(
      `${name} handler error: ${(err as Error).message}`,
      (err as Error).stack,
    );
  }

  private async safeReply(ctx: BotContext, text: string): Promise<void> {
    try {
      await ctx.reply(text);
    } catch {
      // ignore
    }
  }
}
