import { Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { TripModule } from '../trip/trip.module';
import { QueueModule } from '../../queue/queue.module';

@Module({
  imports: [RedisModule, TripModule, QueueModule],
})
export class TestModule {}
