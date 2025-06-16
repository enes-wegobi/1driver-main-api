import { Module } from '@nestjs/common';
import { LockService } from './lock.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [LockService],
  exports: [LockService],
})
export class LockModule {}
