import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseRedisService } from './services/base-redis.service';
import { DriverStatusService } from './services/driver-status.service';
import { CustomerStatusService } from './services/customer-status.service';
import { LocationService } from './services/location.service';
import { NearbySearchService } from './services/nearby-search.service';
import { ActiveTripService } from './services/active-trip.service';
import { DriverTripQueueService } from './services/driver-trip-queue.service';
import { TokenManagerService } from './services/token-manager.service';
import { WebSocketRedisService } from './services/websocket-redis.service';
import { UnifiedUserStatusService } from './services/unified-user-status.service';
import { DriverAvailabilityService } from './services/driver-availability.service';
import { UnifiedUserRedisService } from './services/unified-user-redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BaseRedisService,
    UnifiedUserRedisService,
    UnifiedUserStatusService,
    DriverAvailabilityService,
    LocationService,
    DriverStatusService,
    CustomerStatusService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
    WebSocketRedisService,
  ],
  exports: [
    BaseRedisService,
    UnifiedUserRedisService,
    UnifiedUserStatusService,
    DriverAvailabilityService,
    LocationService,
    DriverStatusService,
    CustomerStatusService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
    WebSocketRedisService,
  ],
})
export class RedisModule {}
