import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaseRedisService } from './services/base-redis.service';
import { LocationService } from './services/location.service';
import { DriverStatusService } from './services/driver-status.service';
import { CustomerStatusService } from './services/customer-status.service';
import { NearbySearchService } from './services/nearby-search.service';
import { ActiveTripService } from './services/active-trip.service';
import { TokenManagerService } from './services/token-manager.service';
import { DriverTripQueueService } from './services/driver-trip-queue.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BaseRedisService,
    LocationService,
    DriverStatusService,
    CustomerStatusService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
  ],
  exports: [
    BaseRedisService,
    LocationService,
    DriverStatusService,
    CustomerStatusService,
    NearbySearchService,
    ActiveTripService,
    TokenManagerService,
    DriverTripQueueService,
  ],
})
export class RedisModule {}
