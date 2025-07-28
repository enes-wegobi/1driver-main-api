import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseRedisService } from './services/base-redis.service';
import { LocationService } from './services/location.service';
import { NearbySearchService } from './services/nearby-search.service';
import { ActiveTripService } from './services/active-trip.service';
import { DriverTripQueueService } from './services/driver-trip-queue.service';
import { TokenManagerService } from './services/token-manager.service';
import { UnifiedUserRedisService } from './services/unified-user-redis.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BaseRedisService,
    UnifiedUserRedisService,
    LocationService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
  ],
  exports: [
    BaseRedisService,
    UnifiedUserRedisService,
    LocationService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
  ],
})
export class RedisModule {}
