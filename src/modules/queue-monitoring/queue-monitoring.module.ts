import { Module } from '@nestjs/common';

import { RedisModule } from '../../redis/redis.module';
import { QueueMonitoringController } from './queue-monitoring.controller';
import { QueueMonitoringService } from './queue-monitoring.service';

@Module({
  imports: [RedisModule],
  controllers: [QueueMonitoringController],
  providers: [QueueMonitoringService],
  exports: [QueueMonitoringService],
})
export class QueueMonitoringModule {}
