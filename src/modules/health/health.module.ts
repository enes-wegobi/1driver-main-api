import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisModule } from 'src/redis/redis.module';
import { QueueModule } from 'src/queue/queue.module';
import { LoggerModule } from 'src/logger/logger.module';
import { ConfigModule } from '@nestjs/config';
import { WebSocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    RedisModule,
    QueueModule,
    WebSocketModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
