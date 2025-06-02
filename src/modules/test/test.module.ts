import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { RedisModule } from '../../redis/redis.module';
import { TripModule } from '../trip/trip.module';

@Module({
  imports: [RedisModule, TripModule],
  controllers: [TestController],
})
export class TestModule {}
