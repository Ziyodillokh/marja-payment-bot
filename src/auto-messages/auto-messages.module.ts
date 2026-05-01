import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AutoMessagesService } from './auto-messages.service';
import { AutoMessagesProcessor } from './auto-messages.processor';
import { AutoMessagesScheduler } from './auto-messages.scheduler';
import { QUEUE_NAMES } from '../common/enums/queue-names.enum';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.AUTO_MESSAGE })],
  providers: [AutoMessagesService, AutoMessagesProcessor, AutoMessagesScheduler],
  exports: [AutoMessagesService, AutoMessagesScheduler, BullModule],
})
export class AutoMessagesModule {}
