import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BroadcastService } from './broadcast.service';
import { BroadcastProcessor } from './broadcast.processor';
import { QUEUE_NAMES } from '../common/enums/queue-names.enum';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.BROADCAST })],
  providers: [BroadcastService, BroadcastProcessor],
  exports: [BroadcastService],
})
export class BroadcastModule {}
