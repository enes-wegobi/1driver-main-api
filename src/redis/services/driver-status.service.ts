import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

@Injectable()
export class DriverStatusService extends BaseRedisService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @WithErrorHandling()
  async markDriverAsActive(driverId: string) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.driverActive(driverId);

    pipeline.set(key, new Date().toISOString());
    pipeline.expire(key, this.ACTIVE_DRIVER_EXPIRY);
    pipeline.sadd(RedisKeyGenerator.activeDriversSet(), driverId);

    await pipeline.exec();
    return true;
  }

  @WithErrorHandling()
  async markDriverAsInactive(driverId: string) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.driverActive(driverId);

    pipeline.del(key);
    pipeline.srem(RedisKeyGenerator.activeDriversSet(), driverId);

    await pipeline.exec();

    // Update availability status to busy when driver becomes inactive
    await this.updateDriverAvailability(
      driverId,
      DriverAvailabilityStatus.BUSY,
    );

    return true;
  }

  @WithErrorHandling()
  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus,
  ) {
    // First set the status key
    const pipeline1 = this.client.multi();
    const key = RedisKeyGenerator.driverStatus(driverId);

    pipeline1.set(key, status);
    pipeline1.expire(key, this.ACTIVE_DRIVER_EXPIRY);

    await pipeline1.exec();

    // Update the status in the location data as well
    const locationKey = RedisKeyGenerator.userLocation(driverId);
    const locationData = await this.client.get(locationKey);

    if (locationData) {
      const parsedData = JSON.parse(locationData);
      parsedData.availabilityStatus = status;

      // Use another pipeline for setting the updated location data
      const pipeline2 = this.client.multi();
      pipeline2.set(locationKey, JSON.stringify(parsedData));
      pipeline2.expire(locationKey, this.DRIVER_LOCATION_EXPIRY);

      await pipeline2.exec();
    }

    return true;
  }

  @WithErrorHandling(DriverAvailabilityStatus.BUSY)
  async getDriverAvailability(
    driverId: string,
  ): Promise<DriverAvailabilityStatus> {
    const key = RedisKeyGenerator.driverStatus(driverId);
    const status = await this.client.get(key);

    return (
      (status as DriverAvailabilityStatus) || DriverAvailabilityStatus.BUSY
    );
  }

  @WithErrorHandling(false)
  async isDriverActive(driverId: string): Promise<boolean> {
    const key = RedisKeyGenerator.driverActive(driverId);
    const result = await this.client.exists(key);

    return result === 1;
  }

  @WithErrorHandling([])
  async getActiveDrivers(): Promise<string[]> {
    return await this.client.smembers(RedisKeyGenerator.activeDriversSet());
  }

  @WithErrorHandling([])
  async checkDriversActiveStatus(
    driverIds: string[],
  ): Promise<{ driverId: string; isActive: boolean }[]> {
    if (driverIds.length === 0) {
      return [];
    }

    // Use Redis SMISMEMBER command to check multiple members in a single operation
    const activeStatusArray = await this.client.call(
      'SMISMEMBER',
      RedisKeyGenerator.activeDriversSet(),
      ...driverIds,
    );

    // Map results (1 = active, 0 = inactive)
    return driverIds.map((driverId, index) => {
      // Ensure we always return a boolean
      const isActive = activeStatusArray
        ? activeStatusArray[index] === 1
        : false;
      return { driverId, isActive };
    });
  }
}
