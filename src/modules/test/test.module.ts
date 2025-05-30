import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [TestController],
})
export class TestModule {}
