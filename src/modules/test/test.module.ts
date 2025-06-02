import { Module } from '@nestjs/common';
import { BullQueueTestController } from './bull-queue-test.controller';
import { RedisModule } from '../../redis/redis.module';
import { TripModule } from '../trip/trip.module';
import { QueueModule } from '../../queue/queue.module';

@Module({
  imports: [RedisModule, TripModule, QueueModule],
  controllers: [BullQueueTestController],
})
export class TestModule {}
