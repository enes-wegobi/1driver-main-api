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

    // DO NOT automatically set availability to offline
    // Driver's availability status should remain as they set it

    return true;
  }

  @WithErrorHandling()
  async markDriverAsDisconnected(driverId: string) {
    // Only update connection status, not availability status
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.driverActive(driverId);

    pipeline.del(key);
    pipeline.srem(RedisKeyGenerator.activeDriversSet(), driverId);

    await pipeline.exec();

    return true;
  }

  @WithErrorHandling()
  async markDriverAsConnected(driverId: string) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.driverActive(driverId);

    pipeline.set(key, new Date().toISOString());
    pipeline.expire(key, this.ACTIVE_DRIVER_EXPIRY);
    pipeline.sadd(RedisKeyGenerator.activeDriversSet(), driverId);

    await pipeline.exec();

    return true;
  }

  // ========== HEARTBEAT METHODS (USING EXISTING ACTIVE KEY) ==========

  @WithErrorHandling()
  async updateDriverHeartbeat(driverId: string): Promise<void> {
    // Mevcut driver:active key'ini heartbeat için kullan
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.driverActive(driverId);

    // Hem timestamp'i güncelle hem TTL'yi refresh et
    pipeline.set(key, new Date().toISOString());
    pipeline.expire(key, this.ACTIVE_DRIVER_EXPIRY);
    pipeline.sadd(RedisKeyGenerator.activeDriversSet(), driverId);

    await pipeline.exec();
  }

  @WithErrorHandling()
  async updateDriverLastSeen(driverId: string, timestamp: Date): Promise<void> {
    await this.updateDriverHeartbeat(driverId);
  }

  @WithErrorHandling(false)
  async isDriverHeartbeatActive(driverId: string): Promise<boolean> {
    return await this.isDriverActive(driverId);
  }

  @WithErrorHandling([])
  async getDriversWithActiveHeartbeat(): Promise<string[]> {
    // Mevcut active drivers'ı döndür
    return await this.getActiveDrivers();
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

  @WithErrorHandling(false)
  async isDriverRecentlyActive(driverId: string): Promise<boolean> {
    const key = RedisKeyGenerator.driverActive(driverId);
    const lastActive = await this.client.get(key);

    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;

    return now - lastActiveTime < twoMinutes;
  }

  @WithErrorHandling(false)
  async canAssignTripToDriver(driverId: string): Promise<boolean> {
    const availability = await this.getDriverAvailability(driverId);
    if (availability !== DriverAvailabilityStatus.AVAILABLE) {
      return false;
    }

    const hasActiveHeartbeat = await this.isDriverHeartbeatActive(driverId);
    if (!hasActiveHeartbeat) {
      return false;
    }

    return true;
  }

  @WithErrorHandling({ canChange: false, reason: 'Unknown error' })
  async canChangeAvailability(
    driverId: string,
    newStatus: DriverAvailabilityStatus,
  ): Promise<{ canChange: boolean; reason?: string }> {
    const currentStatus = await this.getDriverAvailability(driverId);

    if (currentStatus === DriverAvailabilityStatus.ON_TRIP) {
      return {
        canChange: false,
        reason:
          'Cannot change availability while on trip. Status is controlled by trip system.',
      };
    }

    if (
      (currentStatus === DriverAvailabilityStatus.BUSY &&
        newStatus === DriverAvailabilityStatus.AVAILABLE) ||
      (currentStatus === DriverAvailabilityStatus.AVAILABLE &&
        newStatus === DriverAvailabilityStatus.BUSY)
    ) {
      return { canChange: true };
    }

    if (currentStatus.toString() === newStatus.toString()) {
      return { canChange: true };
    }

    return {
      canChange: false,
      reason: 'Invalid status transition',
    };
  }

  @WithErrorHandling([])
  async cleanupStaleDrivers(): Promise<string[]> {
    const cleanedDrivers: string[] = [];

    // Get all drivers in active set
    const activeDriversInSet = await this.getActiveDrivers();

    for (const driverId of activeDriversInSet) {
      // Check if driver's active key still exists (heartbeat check)
      const hasActiveHeartbeat = await this.isDriverHeartbeatActive(driverId);

      if (!hasActiveHeartbeat) {
        // Driver's heartbeat expired, remove from active set
        await this.markDriverAsDisconnected(driverId);
        cleanedDrivers.push(driverId);

        this.logger.log(
          `Driver ${driverId} cleaned up due to heartbeat timeout`,
        );
      }
    }

    return cleanedDrivers;
  }

  @WithErrorHandling([])
  async cleanupStaleDriversAdvanced(): Promise<{
    heartbeatExpired: string[];
    availabilityChanged: string[];
  }> {
    const heartbeatExpired: string[] = [];
    const availabilityChanged: string[] = [];

    // Get all drivers in active set
    const activeDriversInSet = await this.getActiveDrivers();

    for (const driverId of activeDriversInSet) {
      // 1. Check heartbeat status
      const hasActiveHeartbeat = await this.isDriverHeartbeatActive(driverId);

      if (!hasActiveHeartbeat) {
        // Heartbeat expired
        await this.markDriverAsDisconnected(driverId);
        heartbeatExpired.push(driverId);

        this.logger.warn(
          `Driver ${driverId} disconnected due to heartbeat timeout`,
        );
      } else {
        // 2. Check if driver is available but hasn't been active for too long
        const availability = await this.getDriverAvailability(driverId);

        if (availability === DriverAvailabilityStatus.AVAILABLE) {
          const isRecentlyActive = await this.isDriverRecentlyActive(driverId);

          if (!isRecentlyActive) {
            // Driver has heartbeat but hasn't been actively responding
            // Optionally change their status to BUSY
            await this.updateDriverAvailability(
              driverId,
              DriverAvailabilityStatus.BUSY,
            );
            availabilityChanged.push(driverId);

            this.logger.log(
              `Driver ${driverId} automatically set to BUSY due to inactivity`,
            );
          }
        }
      }
    }

    return { heartbeatExpired, availabilityChanged };
  }

  // ========== MONITORING METHODS ==========

  @WithErrorHandling({
    totalDrivers: 0,
    connectedDrivers: 0,
    availableDrivers: 0,
    onTripDrivers: 0,
    busyDrivers: 0,
  })
  async getDriverStatusSummary(): Promise<{
    totalDrivers: number;
    connectedDrivers: number;
    availableDrivers: number;
    onTripDrivers: number;
    busyDrivers: number;
  }> {
    const activeDrivers = await this.getActiveDrivers();
    const connectedDrivers = activeDrivers.length;

    let availableCount = 0;
    let onTripCount = 0;
    let busyCount = 0;

    // Batch process for efficiency
    const batchSize = 50;
    for (let i = 0; i < activeDrivers.length; i += batchSize) {
      const batch = activeDrivers.slice(i, i + batchSize);
      const pipeline = this.client.multi();

      batch.forEach((driverId) => {
        pipeline.get(RedisKeyGenerator.driverStatus(driverId));
      });

      const results = await pipeline.exec();

      if (results) {
        for (let j = 0; j < batch.length; j++) {
          const status = results[j][1] as DriverAvailabilityStatus;

          switch (status) {
            case DriverAvailabilityStatus.AVAILABLE:
              availableCount++;
              break;
            case DriverAvailabilityStatus.ON_TRIP:
              onTripCount++;
              break;
            case DriverAvailabilityStatus.BUSY:
            default:
              busyCount++;
              break;
          }
        }
      }
    }

    return {
      totalDrivers: connectedDrivers, // We can get total from DB if needed
      connectedDrivers,
      availableDrivers: availableCount,
      onTripDrivers: onTripCount,
      busyDrivers: busyCount,
    };
  }
}
