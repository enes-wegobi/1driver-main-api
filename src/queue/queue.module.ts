import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TripQueueService } from './services/trip-queue.service';
import { QueueOrchestrator } from './services/queue-orchestrator.service';
import { ResponseHandler } from './services/response-handler.service';
import { EnhancedDriverRequestProcessor } from './services/enhanced-driver-request-processor.service';
import { QueuePerformanceMonitor } from './services/queue-performance-monitor.service';
import { TripRequestProcessor } from './processors/trip-request.processor';
import { TripTimeoutProcessor } from './processors/trip-timeout.processor';
import { TripModule } from 'src/modules/trip/trip.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventModule } from 'src/modules/event/event.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('queue.redis.host'),
          port: configService.get('queue.redis.port'),
          username: configService.get('queue.redis.username'),
          password: configService.get('queue.redis.password'),
          db: configService.get('queue.redis.db'),
          ...(configService.get('queue.redis.tls') && { tls: {} }),
        },
        defaultJobOptions: configService.get('queue.defaultJobOptions'),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: 'trip-requests',
      },
      {
        name: 'trip-timeouts',
      },
    ),
    forwardRef(() => TripModule),
    RedisModule,
    EventModule,
  ],
  providers: [
    TripQueueService,
    QueueOrchestrator,
    ResponseHandler,
    EnhancedDriverRequestProcessor,
    QueuePerformanceMonitor,
    TripRequestProcessor,
    TripTimeoutProcessor,
  ],
  exports: [
    TripQueueService,
    QueueOrchestrator,
    ResponseHandler,
    EnhancedDriverRequestProcessor,
    QueuePerformanceMonitor,
  ],
})
export class QueueModule {}
