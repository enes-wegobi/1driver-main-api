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
import { SessionMetadataService } from './services/session-metadata.service';

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
    SessionMetadataService,
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
    SessionMetadataService,
    DriverTripQueueService,
  ],
})
export class RedisModule {}
